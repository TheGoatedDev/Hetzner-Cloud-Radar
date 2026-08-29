import { and, desc, eq, gte, inArray, sum } from "drizzle-orm";
import {
  DCS,
  type DcCode,
  type Family,
  type FamilyId,
  type Stock,
  type StockEvent,
  type SupplyDay,
} from "@/lib/schema";
import {
  serverFamilyOrder,
  visibleServerFamilies,
  visibleServerFamilyIds,
} from "@/lib/server-families";
import { getDb } from "../db/client";
import {
  availabilityCurrent,
  dailySupplyByFamily,
  pollRuns,
  serverTypes,
  stockEvents,
} from "../db/schema";
import { POLL_CADENCE } from "./cadence";

export { POLL_CADENCE };

export type AvailabilityReadModel = {
  families: Family[];
  observedAt: string;
  observedDate: string;
  pollCadence: string;
  topLine: { state: Stock; line: string };
  events: StockEvent[];
  supplyHistory: SupplyDay[];
  usingFallback: boolean;
};

type DispatchTransition = {
  observed_at: Date | string;
  server_type_code: string;
  location_code: string;
  base_status: "available" | "sold-out" | "not-offered" | "unknown";
  prev_status: "available" | "sold-out" | "not-offered" | "unknown" | null;
  current_status: Stock | null;
  previous_sold_out_at: Date | string | null;
};

export function formatObservedAt(date: Date | string) {
  return toDate(date)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC");
}

export async function getObservedAtLabel(fallback = "awaiting first poll") {
  const latestAt = await getLatestPollAt();

  return latestAt ? formatObservedAt(latestAt) : fallback;
}

function formatDispatchTime(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function formatDuration(start: Date, end: Date) {
  const seconds = Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / 1000),
  );
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${Math.max(1, minutes)}m`;
}

function row(values: Partial<Record<DcCode, Stock>>) {
  return Object.fromEntries(
    DCS.map((dc) => [dc, values[dc] ?? "unknown"]),
  ) as Record<DcCode, Stock>;
}

function blankSupplyHistory(observedDate: string): SupplyDay[] {
  return Array.from({ length: 60 }, (_, index) => {
    const date = new Date(`${observedDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (59 - index));

    return {
      date: date.toISOString().slice(0, 10),
      available: 0,
      limited: 0,
      soldOut: 0,
    };
  });
}

function makeTopLine(families: Family[]) {
  const cells = families.flatMap((family) =>
    family.types.flatMap((type) => DCS.map((dc) => type.stock[dc])),
  );
  const soldOut = cells.filter((status) => status === "sold-out").length;
  const limited = cells.filter((status) => status === "limited").length;
  const unknown = cells.filter((status) => status === "unknown").length;
  const state: Stock =
    soldOut > 0
      ? "sold-out"
      : limited > 0
        ? "limited"
        : unknown > 0
          ? "unknown"
          : "available";

  return {
    state,
    line: `${soldOut} server-type/datacentre pairs are sold out, ${limited} are flickering today, and ${unknown} are unknown.`,
  };
}

function fallbackModel(): AvailabilityReadModel {
  const now = new Date();
  const observedDate = now.toISOString().slice(0, 10);
  const unknownStock = row({});
  const families = visibleServerFamilies().map(({ id, meta }) => ({
    id,
    label: meta.label,
    kicker: meta.kicker,
    blurb: meta.blurb,
    types: meta.fallbackTypes.map((type) => ({
      ...type,
      stock: unknownStock,
    })),
  }));
  return {
    families,
    observedAt: "No successful poll yet",
    observedDate,
    pollCadence: POLL_CADENCE,
    topLine: {
      state: "unknown",
      line: "No successful availability poll has been stored yet.",
    },
    events: [],
    supplyHistory: blankSupplyHistory(observedDate),
    usingFallback: true,
  };
}

function isActiveServerType(row: typeof serverTypes.$inferSelect) {
  return !(
    row.raw &&
    typeof row.raw === "object" &&
    "missingFromApi" in row.raw &&
    row.raw.missingFromApi === true
  );
}

function serverTypeOrder(code: string) {
  const numeric = Number.parseInt(code.replace(/^\D+/u, ""), 10);

  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
}

function makeDispatch(
  transition: DispatchTransition,
  latestAt: Date,
): StockEvent | null {
  const code = transition.server_type_code;
  const location = transition.location_code.toUpperCase();
  const observedAt = toDate(transition.observed_at);
  const previousSoldOutAt = transition.previous_sold_out_at
    ? toDate(transition.previous_sold_out_at)
    : null;
  const startedAt = `${formatDispatchTime(observedAt)} UTC`;
  const id = [
    observedAt.toISOString(),
    code,
    location,
    transition.base_status,
    transition.prev_status ?? "initial",
  ].join(":");

  if (transition.base_status === "sold-out") {
    if (transition.current_status !== "sold-out") {
      return null;
    }

    return {
      id,
      startedAt,
      resolvedAt: null,
      durationLabel: `ongoing · ${formatDuration(observedAt, latestAt)}`,
      scope: `${code} / ${location}`,
      title: `${code} sold out in ${location}`,
      body: `${code} is currently unavailable for new provisioning in ${location}. This sold-out run was first observed at ${startedAt}.`,
      state: "ongoing-out" as const,
    };
  }

  if (transition.prev_status === "sold-out") {
    const outageDuration = previousSoldOutAt
      ? ` after ${formatDuration(previousSoldOutAt, observedAt)} sold out`
      : "";

    return {
      id,
      startedAt,
      resolvedAt: startedAt,
      durationLabel: outageDuration ? outageDuration.trim() : "restocked",
      scope: `${code} / ${location}`,
      title: `${code} returned in ${location}`,
      body: `${code} became available for new provisioning in ${location}${outageDuration}.`,
      state: "resolved-restock" as const,
    };
  }

  if (transition.prev_status === "not-offered") {
    return {
      id,
      startedAt,
      resolvedAt: null,
      durationLabel: "newly offered",
      scope: `${code} / ${location}`,
      title: `${code} became available in ${location}`,
      body: `${code} moved from not offered to available in ${location}. This may indicate a rollout or newly exposed capacity for that location.`,
      state: "ongoing-rollout" as const,
    };
  }

  return null;
}

export async function getLatestPollAt(): Promise<Date | null> {
  // Build/prerender has no DB; callers treat null as "no poll yet".
  try {
    const db = await getDb();
    const [latest] = await db
      .select({ finishedAt: pollRuns.finishedAt })
      .from(pollRuns)
      .where(eq(pollRuns.status, "success"))
      .orderBy(desc(pollRuns.finishedAt))
      .limit(1);

    return latest?.finishedAt ? new Date(latest.finishedAt) : null;
  } catch (error) {
    console.error("Latest poll lookup failed", error);
    return null;
  }
}

export async function getDispatchEvents(
  latestAt: Date,
  limit = 8,
  windowDays = 30,
): Promise<StockEvent[]> {
  const visibleFamilies = visibleServerFamilyIds();

  if (visibleFamilies.length === 0) return [];

  const cutoff = new Date(latestAt);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);

  // stock_events is one row per status change — not one per poll.
  const db = await getDb();
  const rows = await db
    .select({
      observedAt: stockEvents.observedAt,
      serverTypeCode: stockEvents.serverTypeCode,
      locationCode: stockEvents.locationCode,
      baseStatus: stockEvents.baseStatus,
      prevStatus: stockEvents.prevStatus,
      previousSoldOutAt: stockEvents.previousSoldOutAt,
      currentStatus: availabilityCurrent.displayStatus,
    })
    .from(stockEvents)
    .innerJoin(serverTypes, eq(stockEvents.serverTypeCode, serverTypes.code))
    .leftJoin(
      availabilityCurrent,
      and(
        eq(availabilityCurrent.serverTypeCode, stockEvents.serverTypeCode),
        eq(availabilityCurrent.locationCode, stockEvents.locationCode),
      ),
    )
    .where(
      and(
        gte(stockEvents.observedAt, cutoff.toISOString()),
        inArray(serverTypes.family, visibleFamilies),
      ),
    )
    .orderBy(desc(stockEvents.observedAt))
    .limit(Math.max(limit * 2, 16));

  return rows
    .map((row) =>
      makeDispatch(
        {
          observed_at: row.observedAt,
          server_type_code: row.serverTypeCode,
          location_code: row.locationCode,
          base_status: row.baseStatus,
          prev_status: row.prevStatus,
          previous_sold_out_at: row.previousSoldOutAt,
          current_status: (row.currentStatus as Stock | null) ?? null,
        },
        latestAt,
      ),
    )
    .filter((event): event is StockEvent => event !== null)
    .slice(0, limit);
}

export async function getAvailabilityReadModel(): Promise<AvailabilityReadModel> {
  try {
    const db = await getDb();
    // Parallel first round — current/types don't depend on latest poll row.
    const [latestPoll, currentRows, typeRows] = await Promise.all([
      db
        .select()
        .from(pollRuns)
        .where(eq(pollRuns.status, "success"))
        .orderBy(desc(pollRuns.finishedAt))
        .limit(1),
      db.select().from(availabilityCurrent),
      db.select().from(serverTypes),
    ]);

    if (!latestPoll[0]?.finishedAt) {
      return fallbackModel();
    }

    if (currentRows.length === 0 || typeRows.length === 0) {
      return fallbackModel();
    }

    const currentByCell = new Map(
      currentRows.map((current) => [
        `${current.serverTypeCode}:${current.locationCode}`,
        current.displayStatus as Stock,
      ]),
    );
    const visibleFamilies = visibleServerFamilies();
    const visibleFamilyIds = visibleFamilies.map(({ id }) => id);
    const activeTypes = typeRows
      .filter(isActiveServerType)
      .filter((type) => visibleFamilyIds.includes(type.family))
      .sort((a, b) => {
        const familyDelta =
          serverFamilyOrder(a.family) - serverFamilyOrder(b.family);

        if (familyDelta !== 0) return familyDelta;

        return serverTypeOrder(a.code) - serverTypeOrder(b.code);
      });
    const typesByFamily = new Map<FamilyId, typeof activeTypes>();
    for (const type of activeTypes) {
      const family = type.family as FamilyId;
      const specs = typesByFamily.get(family) ?? [];

      specs.push(type);
      typesByFamily.set(family, specs);
    }
    const families = visibleFamilies.flatMap(({ id, meta }) => {
      const family = {
        id,
        label: meta.label,
        kicker: meta.kicker,
        blurb: meta.blurb,
      };
      const specs = typesByFamily.get(family.id) ?? [];

      if (specs.length === 0) {
        return [];
      }

      return {
        ...family,
        types: specs.map((spec) => ({
          code: spec.code,
          cores: spec.cores,
          ram: spec.memoryGb,
          disk: spec.diskGb,
          stock: row(
            Object.fromEntries(
              DCS.map((dc) => [
                dc,
                currentByCell.get(`${spec.code}:${dc}`) ?? "unknown",
              ]),
            ) as Partial<Record<DcCode, Stock>>,
          ),
        })),
      };
    });

    const finishedAt = toDate(latestPoll[0].finishedAt);
    const observedAt = formatObservedAt(finishedAt);
    const observedDate = finishedAt.toISOString().slice(0, 10);
    const topLine = makeTopLine(families);
    const sixtyDaysAgo = new Date(finishedAt);
    sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 59);
    const [dailyRows, events] = await Promise.all([
      db
        .select({
          dateUtc: dailySupplyByFamily.dateUtc,
          available: sum(dailySupplyByFamily.available),
          limited: sum(dailySupplyByFamily.limited),
          soldOut: sum(dailySupplyByFamily.soldOut),
        })
        .from(dailySupplyByFamily)
        .where(
          and(
            gte(
              dailySupplyByFamily.dateUtc,
              sixtyDaysAgo.toISOString().slice(0, 10),
            ),
            inArray(dailySupplyByFamily.family, visibleFamilyIds),
          ),
        )
        .groupBy(dailySupplyByFamily.dateUtc)
        .orderBy(dailySupplyByFamily.dateUtc),
      getDispatchEvents(finishedAt),
    ]);
    const dailyByDate = new Map(
      dailyRows.map((day) => [
        day.dateUtc,
        {
          available: Number(day.available),
          limited: Number(day.limited),
          soldOut: Number(day.soldOut),
        },
      ]),
    );
    const supplyHistory = blankSupplyHistory(observedDate).map((blank) => {
      const day = dailyByDate.get(blank.date);

      return {
        date: blank.date,
        available: day?.available ?? 0,
        limited: day?.limited ?? 0,
        soldOut: day?.soldOut ?? 0,
      };
    });

    return {
      families,
      observedAt,
      observedDate,
      pollCadence: POLL_CADENCE,
      topLine,
      events,
      supplyHistory,
      usingFallback: false,
    };
  } catch (error) {
    console.error("Availability read model failed", error);

    return fallbackModel();
  }
}
