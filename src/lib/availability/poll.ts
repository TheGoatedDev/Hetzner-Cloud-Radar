import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { DCS, type DcCode, type FamilyId, type Stock } from "@/lib/schema";
import { getDb } from "../db/client";
import {
  availabilityCurrent,
  availabilityObservations,
  dailyAvailabilityState,
  locations,
  pollRuns,
  serverTypes,
} from "../db/schema";
import { sendPendingMarketingDispatches } from "../marketing/dispatch-email";
import {
  fetchHetznerServerTypes,
  type HetznerServerType,
  normalizeLocationCode,
  readLocation,
} from "./hetzner";

type BaseStatus = Exclude<Stock, "limited">;

const TRACKED_LOCATION_META: Record<
  DcCode,
  { apiName: string; city: string; country: string; networkZone: string }
> = {
  NBG1: {
    apiName: "nbg1",
    city: "Nuremberg",
    country: "DE",
    networkZone: "eu-central",
  },
  FSN1: {
    apiName: "fsn1",
    city: "Falkenstein",
    country: "DE",
    networkZone: "eu-central",
  },
  HEL1: {
    apiName: "hel1",
    city: "Helsinki",
    country: "FI",
    networkZone: "eu-central",
  },
  ASH: {
    apiName: "ash",
    city: "Ashburn",
    country: "US",
    networkZone: "us-east",
  },
  HIL: {
    apiName: "hil",
    city: "Hillsboro",
    country: "US",
    networkZone: "us-west",
  },
  SIN: {
    apiName: "sin",
    city: "Singapore",
    country: "SG",
    networkZone: "ap-southeast",
  },
};

function getFamily(code: string): FamilyId | "other" {
  const normalized = code.toLowerCase();

  if (normalized.startsWith("cax")) return "cax";
  if (normalized.startsWith("cpx")) return "cpx";
  if (normalized.startsWith("ccx")) return "ccx";
  if (normalized.startsWith("cx")) return "cx";

  return "other";
}

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
  serverType: HetznerServerType,
  dc: DcCode,
): ReturnType<typeof readLocation> | null {
  const expected = TRACKED_LOCATION_META[dc].apiName;
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
    const trackedServerTypes = fetchedServerTypes.filter(
      (serverType) => getFamily(serverType.name) !== "other",
    );
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
      const fallback = TRACKED_LOCATION_META[dc];

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
            family: getFamily(serverType.name),
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

    return {
      pollRunId,
      observedAt: observedAt.toISOString(),
      insertedObservations: observationValues.length,
      currentUpdated: currentRows.length,
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
