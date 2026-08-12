import { randomUUID } from "node:crypto";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { DC_META, DCS, type DcCode, type Stock } from "@/lib/schema";
import {
  deriveServerFamilyId,
  isConfiguredServerFamily,
} from "@/lib/server-families";
import { getDb } from "../db/client";
import {
  availabilityCurrent,
  dailyAvailabilityState,
  locations,
  pollRuns,
  serverTypes,
  stockEvents,
} from "../db/schema";
import { sendPendingMarketingDispatches } from "../marketing/dispatch-email";
import {
  fetchHetznerServerTypes,
  type HetznerServerType,
  normalizeLocationCode,
  readLocation,
} from "./hetzner";
import { HISTORY_WINDOW_DAYS } from "./history";

type BaseStatus = Exclude<Stock, "limited">;
type TrackedServerType = HetznerServerType & { family: string };

const EVENT_RETENTION_DAYS = 60;

type PruneResult = {
  deletedPollRuns: number;
};

async function pruneRetention(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<PruneResult> {
  const rawCutoffIso = new Date(
    Date.now() - HISTORY_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const eventCutoff = new Date(Date.now() - EVENT_RETENTION_DAYS * 86_400_000);
  const eventCutoffDay = eventCutoff.toISOString().slice(0, 10);
  const eventCutoffIso = eventCutoff.toISOString();

  // ponytail: simple deletes; no obs table
  const deleted = await db
    .delete(pollRuns)
    .where(lt(pollRuns.startedAt, rawCutoffIso))
    .returning({ id: pollRuns.id });
  await db
    .delete(dailyAvailabilityState)
    .where(lt(dailyAvailabilityState.dateUtc, eventCutoffDay));
  await db
    .delete(stockEvents)
    .where(lt(stockEvents.observedAt, eventCutoffIso));

  return { deletedPollRuns: deleted.length };
}

const TRACKED_LOCATION_API: Record<
  DcCode,
  { apiName: string; networkZone: string }
> = {
  NBG1: { apiName: "nbg1", networkZone: "eu-central" },
  FSN1: { apiName: "fsn1", networkZone: "eu-central" },
  HEL1: { apiName: "hel1", networkZone: "eu-central" },
  ASH: { apiName: "ash", networkZone: "us-east" },
  HIL: { apiName: "hil", networkZone: "us-west" },
  SIN: { apiName: "sin", networkZone: "ap-southeast" },
};

function toDateUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

function displayStatus(
  baseStatus: BaseStatus,
  sawAvailable: boolean,
  sawSoldOut: boolean,
): Stock {
  if (baseStatus === "available" && sawAvailable && sawSoldOut) {
    return "limited";
  }

  return baseStatus;
}

function getHttpStatus(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "httpStatus" in error &&
    typeof error.httpStatus === "number"
  ) {
    return error.httpStatus;
  }

  return null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown poll failure";
}

function findTrackedLocation(
  serverType: TrackedServerType,
  dc: DcCode,
): ReturnType<typeof readLocation> | null {
  const expected = TRACKED_LOCATION_API[dc].apiName;
  const match = serverType.locations
    .map(readLocation)
    .find((location) => location.apiName === expected);

  return match ?? null;
}

export async function pollAvailability() {
  const pollRunId = randomUUID();
  const observedAt = new Date();
  const dateUtc = toDateUtc(observedAt);

  try {
    const db = await getDb();

    await db.insert(pollRuns).values({
      id: pollRunId,
      startedAt: observedAt.toISOString(),
      status: "failed",
    });

    const fetchedServerTypes = await fetchHetznerServerTypes();
    const skippedMalformedServerTypes: string[] = [];
    const trackedServerTypes: TrackedServerType[] = [];

    for (const serverType of fetchedServerTypes) {
      const family = deriveServerFamilyId(serverType.name);

      if (!family) {
        skippedMalformedServerTypes.push(serverType.name);
        continue;
      }

      trackedServerTypes.push({ ...serverType, family });
    }

    const unknownFamilies = [
      ...new Set(
        trackedServerTypes
          .map((serverType) => serverType.family)
          .filter((family) => !isConfiguredServerFamily(family)),
      ),
    ].sort();
    const fetchedLocations = new Map<string, ReturnType<typeof readLocation>>();

    for (const serverType of trackedServerTypes) {
      for (const location of serverType.locations.map(readLocation)) {
        if (location.apiName) {
          fetchedLocations.set(location.code, location);
        }
      }
    }

    const locationValues = DCS.map((dc) => {
      const fetched = fetchedLocations.get(dc);
      const fallback = { ...DC_META[dc], ...TRACKED_LOCATION_API[dc] };

      return {
        code: dc,
        apiName: fetched?.apiName ?? fallback.apiName,
        city: fetched?.city || fallback.city,
        country: fetched?.country || fallback.country,
        networkZone: fetched?.networkZone || fallback.networkZone,
        raw: (fetched?.raw ?? fallback) as Record<string, unknown>,
      };
    });

    // ponytail: D1/drizzle ON CONFLICT("table"."col") is invalid — per-row upsert
    for (const row of locationValues) {
      await db
        .insert(locations)
        .values(row)
        .onConflictDoUpdate({
          target: locations.code,
          set: {
            apiName: row.apiName,
            city: row.city,
            country: row.country,
            networkZone: row.networkZone,
            raw: row.raw,
          },
        });
    }

    for (const serverType of trackedServerTypes) {
      const row = {
        code: serverType.name,
        hetznerId: serverType.id,
        family: serverType.family,
        cores: serverType.cores,
        memoryGb: serverType.memory,
        diskGb: serverType.disk,
        architecture: serverType.architecture,
        raw: serverType.raw as Record<string, unknown>,
      };
      await db
        .insert(serverTypes)
        .values(row)
        .onConflictDoUpdate({
          target: serverTypes.code,
          set: {
            hetznerId: row.hetznerId,
            family: row.family,
            cores: row.cores,
            memoryGb: row.memoryGb,
            diskGb: row.diskGb,
            architecture: row.architecture,
            raw: row.raw,
          },
        });
    }

    const fetchedCodes = new Set(
      trackedServerTypes.map((serverType) => serverType.name),
    );
    const storedServerTypes = await db.select().from(serverTypes);
    const missingFromApiAt = observedAt.toISOString();

    for (const stored of storedServerTypes) {
      if (fetchedCodes.has(stored.code)) continue;

      await db
        .update(serverTypes)
        .set({
          raw: {
            ...(stored.raw && typeof stored.raw === "object" ? stored.raw : {}),
            missingFromApi: true,
            missingFromApiAt,
          },
        })
        .where(sql`${serverTypes.code} = ${stored.code}`);
    }

    const pollStates = trackedServerTypes.flatMap((serverType) =>
      DCS.map((dc) => {
        const location = findTrackedLocation(serverType, dc);
        const baseStatus: BaseStatus = !location
          ? "not-offered"
          : location.available === true
            ? "available"
            : location.available === false
              ? "sold-out"
              : "unknown";

        return {
          serverTypeCode: serverType.name,
          locationCode: normalizeLocationCode(dc.toLowerCase()),
          observedAt,
          apiAvailable: location?.available ?? null,
          apiRecommended: location?.recommended ?? null,
          baseStatus,
        };
      }),
    );

    const previousCurrent = await db.select().from(availabilityCurrent);
    const previousByCell = new Map(
      previousCurrent.map((row) => [
        `${row.serverTypeCode}:${row.locationCode}`,
        row,
      ]),
    );
    const transitionCandidates = pollStates.flatMap((observation) => {
      const previous = previousByCell.get(
        `${observation.serverTypeCode}:${observation.locationCode}`,
      );
      const prevStatus = previous?.baseStatus ?? null;
      const nextStatus = observation.baseStatus;

      const isSoldOutStart =
        nextStatus === "sold-out" &&
        (prevStatus === null || prevStatus !== "sold-out");
      const isRestockOrRollout =
        nextStatus === "available" &&
        (prevStatus === "sold-out" || prevStatus === "not-offered");

      if (!isSoldOutStart && !isRestockOrRollout) return [];

      return [
        {
          id: randomUUID(),
          observedAt: observedAt.toISOString(),
          serverTypeCode: observation.serverTypeCode,
          locationCode: observation.locationCode,
          baseStatus: nextStatus,
          prevStatus,
          previousSoldOutAt: null as string | null,
          needsSoldOutLookup: prevStatus === "sold-out",
        },
      ];
    });

    if (transitionCandidates.length > 0) {
      const restockCells = transitionCandidates
        .filter((event) => event.needsSoldOutLookup)
        .map((event) => ({
          serverTypeCode: event.serverTypeCode,
          locationCode: event.locationCode,
        }));

      const soldOutStartedAt = new Map<string, string>();

      if (restockCells.length > 0) {
        const cellMatch = or(
          ...restockCells.map((cell) =>
            and(
              eq(stockEvents.serverTypeCode, cell.serverTypeCode),
              eq(stockEvents.locationCode, cell.locationCode),
            ),
          ),
        );

        const priorSoldOut = cellMatch
          ? await db
              .select({
                serverTypeCode: stockEvents.serverTypeCode,
                locationCode: stockEvents.locationCode,
                observedAt: stockEvents.observedAt,
              })
              .from(stockEvents)
              .where(
                and(
                  cellMatch,
                  eq(stockEvents.baseStatus, "sold-out"),
                  lt(stockEvents.observedAt, observedAt.toISOString()),
                ),
              )
              .orderBy(sql`${stockEvents.observedAt} desc`)
          : [];

        for (const row of priorSoldOut) {
          const key = `${row.serverTypeCode}:${row.locationCode}`;
          if (!soldOutStartedAt.has(key)) {
            soldOutStartedAt.set(key, row.observedAt);
          }
        }
      }

      // ponytail: D1 max ~100 bound params — one row at a time
      for (const candidate of transitionCandidates) {
        await db.insert(stockEvents).values({
          id: candidate.id,
          observedAt: candidate.observedAt,
          serverTypeCode: candidate.serverTypeCode,
          locationCode: candidate.locationCode,
          baseStatus: candidate.baseStatus,
          prevStatus: candidate.prevStatus,
          previousSoldOutAt: candidate.needsSoldOutLookup
            ? (soldOutStartedAt.get(
                `${candidate.serverTypeCode}:${candidate.locationCode}`,
              ) ?? null)
            : null,
        });
      }
    }

    for (const observation of pollStates) {
      const sawAvailable = observation.baseStatus === "available";
      const sawSoldOut = observation.baseStatus === "sold-out";

      await db
        .insert(dailyAvailabilityState)
        .values({
          dateUtc,
          serverTypeCode: observation.serverTypeCode,
          locationCode: observation.locationCode,
          sawAvailable,
          sawSoldOut,
          pollCount: 1,
        })
        .onConflictDoUpdate({
          target: [
            dailyAvailabilityState.dateUtc,
            dailyAvailabilityState.serverTypeCode,
            dailyAvailabilityState.locationCode,
          ],
          set: {
            sawAvailable: sql`${dailyAvailabilityState.sawAvailable} OR ${sawAvailable}`,
            sawSoldOut: sql`${dailyAvailabilityState.sawSoldOut} OR ${sawSoldOut}`,
            pollCount: sql`${dailyAvailabilityState.pollCount} + 1`,
          },
        });
    }

    const currentValues = await db
      .select()
      .from(dailyAvailabilityState)
      .where(sql`${dailyAvailabilityState.dateUtc} = ${dateUtc}`);
    const dailyByCell = new Map(
      currentValues.map((row) => [
        `${row.serverTypeCode}:${row.locationCode}`,
        row,
      ]),
    );

    const currentRows = pollStates.map((observation) => {
      const daily = dailyByCell.get(
        `${observation.serverTypeCode}:${observation.locationCode}`,
      );

      return {
        serverTypeCode: observation.serverTypeCode,
        locationCode: observation.locationCode,
        observedAt: observedAt.toISOString(),
        baseStatus: observation.baseStatus,
        displayStatus: displayStatus(
          observation.baseStatus,
          daily?.sawAvailable ?? observation.baseStatus === "available",
          daily?.sawSoldOut ?? observation.baseStatus === "sold-out",
        ),
        apiAvailable: observation.apiAvailable,
        apiRecommended: observation.apiRecommended,
      };
    });

    for (const row of currentRows) {
      await db
        .insert(availabilityCurrent)
        .values(row)
        .onConflictDoUpdate({
          target: [
            availabilityCurrent.serverTypeCode,
            availabilityCurrent.locationCode,
          ],
          set: {
            observedAt: row.observedAt,
            baseStatus: row.baseStatus,
            displayStatus: row.displayStatus,
            apiAvailable: row.apiAvailable,
            apiRecommended: row.apiRecommended,
          },
        });
    }

    const finishedAt = new Date().toISOString();

    await db
      .update(pollRuns)
      .set({
        finishedAt,
        status: "success",
        httpStatus: 200,
        errorMessage: null,
      })
      .where(sql`${pollRuns.id} = ${pollRunId}`);

    const emailDispatches = await sendPendingMarketingDispatches(
      new Date(),
    ).catch((error) => ({
      attemptedDispatches: 0,
      sentDispatches: 0,
      skippedReason:
        error instanceof Error ? error.message : "Email dispatch failed",
    }));

    const prune = await pruneRetention(db).catch((error) => {
      console.error("Retention prune failed", error);
      return { deletedPollRuns: 0 } satisfies PruneResult;
    });

    return {
      pollRunId,
      observedAt: observedAt.toISOString(),
      insertedObservations: pollStates.length,
      currentUpdated: currentRows.length,
      unknownFamilies,
      skippedMalformedServerTypes,
      emailDispatches,
      prune,
      status: "success" as const,
    };
  } catch (error) {
    try {
      const db = await getDb();

      await db
        .update(pollRuns)
        .set({
          finishedAt: new Date().toISOString(),
          status: "failed",
          httpStatus: getHttpStatus(error),
          errorMessage: errorMessage(error),
        })
        .where(sql`${pollRuns.id} = ${pollRunId}`);
    } catch {
      // If the database itself is unavailable, there is nowhere to record failure.
    }

    return {
      pollRunId,
      observedAt: observedAt.toISOString(),
      insertedObservations: 0,
      currentUpdated: 0,
      status: "failed" as const,
      error: errorMessage(error),
    };
  }
}
