import { randomUUID } from "node:crypto";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { DC_META, DCS, type DcCode, type Stock } from "@/lib/schema";
import {
  deriveServerFamilyId,
  isConfiguredServerFamily,
} from "@/lib/server-families";
import { getDb, getSql } from "../db/client";
import {
  availabilityCurrent,
  availabilityObservations,
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

type BaseStatus = Exclude<Stock, "limited">;
type TrackedServerType = HetznerServerType & { family: string };

// Cascade deletes lock observations — keep batches tiny; backlog drains over polls.
const PRUNE_POLL_RUN_BATCH = 10;
const PRUNE_POLL_RUN_ROUNDS = 3;

async function pruneOlderThan(db: ReturnType<typeof getDb>, days: number) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const cutoffDay = cutoff.toISOString().slice(0, 10);
  const rawSql = getSql();

  for (let round = 0; round < PRUNE_POLL_RUN_ROUNDS; round++) {
    // observations FK ON DELETE CASCADE — keep batches small
    const deleted = await rawSql`
      delete from poll_runs
      where id in (
        select id from poll_runs
        where started_at < ${cutoff}
        order by started_at
        limit ${PRUNE_POLL_RUN_BATCH}
      )
      returning id
    `;
    if (deleted.length === 0) break;
  }

  await db
    .delete(dailyAvailabilityState)
    .where(lt(dailyAvailabilityState.dateUtc, cutoffDay));
  await db.delete(stockEvents).where(lt(stockEvents.observedAt, cutoff));
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
    const db = getDb();

    await db.insert(pollRuns).values({
      id: pollRunId,
      startedAt: observedAt,
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
        raw: fetched?.raw ?? fallback,
      };
    });

    await db
      .insert(locations)
      .values(locationValues)
      .onConflictDoUpdate({
        target: locations.code,
        set: {
          apiName: sql`excluded.api_name`,
          city: sql`excluded.city`,
          country: sql`excluded.country`,
          networkZone: sql`excluded.network_zone`,
          raw: sql`excluded.raw`,
        },
      });

    if (trackedServerTypes.length > 0) {
      await db
        .insert(serverTypes)
        .values(
          trackedServerTypes.map((serverType) => ({
            code: serverType.name,
            hetznerId: serverType.id,
            family: serverType.family,
            cores: serverType.cores,
            memoryGb: serverType.memory,
            diskGb: serverType.disk,
            architecture: serverType.architecture,
            raw: serverType.raw,
          })),
        )
        .onConflictDoUpdate({
          target: serverTypes.code,
          set: {
            hetznerId: sql`excluded.hetzner_id`,
            family: sql`excluded.family`,
            cores: sql`excluded.cores`,
            memoryGb: sql`excluded.memory_gb`,
            diskGb: sql`excluded.disk_gb`,
            architecture: sql`excluded.architecture`,
            raw: sql`excluded.raw`,
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

    const observationValues = trackedServerTypes.flatMap((serverType) =>
      DCS.map((dc) => {
        const location = findTrackedLocation(serverType, dc);
        const supported = Boolean(location);
        const baseStatus: BaseStatus = !location
          ? "not-offered"
          : location.available === true
            ? "available"
            : location.available === false
              ? "sold-out"
              : "unknown";

        return {
          id: randomUUID(),
          pollRunId,
          serverTypeCode: serverType.name,
          locationCode: normalizeLocationCode(dc.toLowerCase()),
          observedAt,
          supported,
          apiAvailable: location?.available ?? null,
          apiRecommended: location?.recommended ?? null,
          baseStatus,
        };
      }),
    );

    if (observationValues.length > 0) {
      await db.insert(availabilityObservations).values(observationValues);
    }

    // Diff against prior current snapshot → stock_events (not every poll row).
    const previousCurrent = await db.select().from(availabilityCurrent);
    const previousByCell = new Map(
      previousCurrent.map((row) => [
        `${row.serverTypeCode}:${row.locationCode}`,
        row,
      ]),
    );
    const transitionCandidates = observationValues.flatMap((observation) => {
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
          observedAt,
          serverTypeCode: observation.serverTypeCode,
          locationCode: observation.locationCode,
          baseStatus: nextStatus,
          prevStatus,
          // Filled below for restocks when we know the sold-out start.
          previousSoldOutAt: null as Date | null,
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

      const soldOutStartedAt = new Map<string, Date>();

      if (restockCells.length > 0) {
        const cellMatch = or(
          ...restockCells.map((cell) =>
            and(
              eq(stockEvents.serverTypeCode, cell.serverTypeCode),
              eq(stockEvents.locationCode, cell.locationCode),
            ),
          ),
        );

        // Latest prior sold-out event per restocking cell.
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
                  lt(stockEvents.observedAt, observedAt),
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

      await db.insert(stockEvents).values(
        transitionCandidates.map((candidate) => ({
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
        })),
      );
    }

    for (const observation of observationValues) {
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

    const currentRows = observationValues.map((observation) => {
      const daily = dailyByCell.get(
        `${observation.serverTypeCode}:${observation.locationCode}`,
      );

      return {
        serverTypeCode: observation.serverTypeCode,
        locationCode: observation.locationCode,
        observedAt,
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

    if (currentRows.length > 0) {
      await db
        .insert(availabilityCurrent)
        .values(currentRows)
        .onConflictDoUpdate({
          target: [
            availabilityCurrent.serverTypeCode,
            availabilityCurrent.locationCode,
          ],
          set: {
            observedAt: sql`excluded.observed_at`,
            baseStatus: sql`excluded.base_status`,
            displayStatus: sql`excluded.display_status`,
            apiAvailable: sql`excluded.api_available`,
            apiRecommended: sql`excluded.api_recommended`,
          },
        });
    }

    const finishedAt = new Date();

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
      finishedAt,
    ).catch((error) => ({
      attemptedDispatches: 0,
      sentDispatches: 0,
      sentEmails: 0,
      skippedReason:
        error instanceof Error ? error.message : "Email dispatch failed",
    }));

    // Don't await — prune IO must not stretch the poll or contend with history reads.
    void pruneOlderThan(db, 60).catch((error) => {
      console.error("Retention prune failed", error);
    });

    return {
      pollRunId,
      observedAt: observedAt.toISOString(),
      insertedObservations: observationValues.length,
      currentUpdated: currentRows.length,
      unknownFamilies,
      skippedMalformedServerTypes,
      emailDispatches,
      status: "success" as const,
    };
  } catch (error) {
    try {
      const db = getDb();

      await db
        .update(pollRuns)
        .set({
          finishedAt: new Date(),
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
