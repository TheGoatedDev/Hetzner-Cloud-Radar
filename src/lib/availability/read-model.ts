import { desc, eq, gte, sql } from "drizzle-orm";
import {
  DCS,
  type DcCode,
  type Family,
  type FamilyId,
  type Stock,
  type StockEvent,
  type SupplyDay,
} from "@/lib/schema";
import { getDb, getSql } from "../db/client";
import {
  availabilityCurrent,
  dailyAvailabilityState,
  pollRuns,
  serverTypes,
} from "../db/schema";

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

const POLL_CADENCE = "60 seconds";
const FAMILY_META: Array<Omit<Family, "types">> = [
  {
    id: "cx",
    label: "CX",
    kicker: "Shared Intel",
    blurb: "Intel Xeon, shared vCPU. The default starter line.",
  },
  {
    id: "cax",
    label: "CAX",
    kicker: "ARM Ampere",
    blurb:
      "Ampere Altra ARM. Originally EU-only; rollout to North America is in progress.",
  },
  {
    id: "cpx",
    label: "CPX",
    kicker: "Shared AMD",
    blurb: "AMD EPYC, shared vCPU. Higher single-thread than CX.",
  },
  {
    id: "ccx",
    label: "CCX",
    kicker: "Dedicated AMD",
    blurb:
      "AMD EPYC, dedicated vCPU. The historically-tight line; supply is the story.",
  },
];
const FALLBACK_TYPES: Record<
  FamilyId,
  Array<{ code: string; cores: number; ram: number; disk: number }>
> = {
  cx: [
    { code: "CX23", cores: 2, ram: 4, disk: 40 },
    { code: "CX33", cores: 4, ram: 8, disk: 80 },
    { code: "CX43", cores: 8, ram: 16, disk: 160 },
    { code: "CX53", cores: 16, ram: 32, disk: 320 },
  ],
  cax: [
    { code: "CAX11", cores: 2, ram: 4, disk: 40 },
    { code: "CAX21", cores: 4, ram: 8, disk: 80 },
    { code: "CAX31", cores: 8, ram: 16, disk: 160 },
    { code: "CAX41", cores: 16, ram: 32, disk: 320 },
  ],
  cpx: [
    { code: "CPX11", cores: 2, ram: 2, disk: 40 },
    { code: "CPX21", cores: 3, ram: 4, disk: 80 },
    { code: "CPX31", cores: 4, ram: 8, disk: 160 },
    { code: "CPX41", cores: 8, ram: 16, disk: 240 },
    { code: "CPX51", cores: 16, ram: 32, disk: 360 },
  ],
  ccx: [
    { code: "CCX13", cores: 2, ram: 8, disk: 80 },
    { code: "CCX23", cores: 4, ram: 16, disk: 160 },
    { code: "CCX33", cores: 8, ram: 32, disk: 240 },
    { code: "CCX43", cores: 16, ram: 64, disk: 360 },
    { code: "CCX53", cores: 32, ram: 128, disk: 600 },
    { code: "CCX63", cores: 48, ram: 192, disk: 960 },
  ],
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

function formatObservedAt(date: Date) {
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC");
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

function makeTopLine(families: Family[], observedAt: string) {
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
    line: `${soldOut} server-type/datacentre pairs are sold out, ${limited} are flickering today, and ${unknown} are unknown. Last poll: ${observedAt}.`,
  };
}

function fallbackModel(): AvailabilityReadModel {
  const now = new Date();
  const observedDate = now.toISOString().slice(0, 10);
  const unknownStock = row({});
  const families = FAMILY_META.map((family) => ({
    ...family,
    types: FALLBACK_TYPES[family.id].map((type) => ({
      ...type,
      stock: unknownStock,
    })),
  }));
  const supplyHistory = Array.from({ length: 60 }, (_, index) => {
    const date = new Date(`${observedDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (59 - index));

    return {
      date: date.toISOString().slice(0, 10),
      available: 0,
      limited: 0,
      soldOut: 0,
    };
  });

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
    supplyHistory,
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

function familyOrder(family: FamilyId) {
  return ["cx", "cax", "cpx", "ccx"].indexOf(family);
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

async function getDispatchEvents(latestAt: Date): Promise<StockEvent[]> {
  const rawSql = getSql();
  const cutoff = new Date(latestAt);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffIso = cutoff.toISOString();
  const transitions = await rawSql<DispatchTransition[]>`
    with ordered as (
      select
        o.server_type_code,
        o.location_code,
        o.observed_at,
        o.base_status,
        lag(o.base_status) over cell_order as prev_status,
        max(case when o.base_status = 'sold-out' then o.observed_at end)
          over (
            partition by o.server_type_code, o.location_code
            order by o.observed_at
            rows between unbounded preceding and 1 preceding
          ) as previous_sold_out_at
      from availability_observations o
      where o.observed_at >= ${cutoffIso}
        and o.base_status in ('available', 'sold-out', 'not-offered')
      window cell_order as (
        partition by o.server_type_code, o.location_code
        order by o.observed_at
      )
    )
    select
      ordered.observed_at,
      ordered.server_type_code,
      ordered.location_code,
      ordered.base_status,
      ordered.prev_status,
      ordered.previous_sold_out_at,
      c.display_status as current_status
    from ordered
    left join availability_current c
      on c.server_type_code = ordered.server_type_code
     and c.location_code = ordered.location_code
    where (
      ordered.base_status = 'sold-out'
      and (ordered.prev_status is null or ordered.prev_status <> 'sold-out')
    ) or (
      ordered.base_status = 'available'
      and ordered.prev_status in ('sold-out', 'not-offered')
    )
    order by ordered.observed_at desc
    limit 16
  `;

  return transitions
    .map((transition) => makeDispatch(transition, latestAt))
    .filter((event): event is StockEvent => event !== null)
    .slice(0, 8);
}

export async function getAvailabilityReadModel(): Promise<AvailabilityReadModel> {
  try {
    const db = getDb();
    const latestPoll = await db
      .select()
      .from(pollRuns)
      .where(eq(pollRuns.status, "success"))
      .orderBy(desc(pollRuns.finishedAt))
      .limit(1);

    if (!latestPoll[0]?.finishedAt) {
      return fallbackModel();
    }

    const [currentRows, typeRows] = await Promise.all([
      db.select().from(availabilityCurrent),
      db.select().from(serverTypes),
    ]);

    if (currentRows.length === 0 || typeRows.length === 0) {
      return fallbackModel();
    }

    const currentByCell = new Map(
      currentRows.map((current) => [
        `${current.serverTypeCode}:${current.locationCode}`,
        current.displayStatus as Stock,
      ]),
    );
    const activeTypes = typeRows
      .filter(isActiveServerType)
      .filter((type) => type.family !== "other")
      .sort((a, b) => {
        const familyDelta =
          familyOrder(a.family as FamilyId) - familyOrder(b.family as FamilyId);

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
    const families = FAMILY_META.flatMap((family) => {
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

    const observedAt = formatObservedAt(latestPoll[0].finishedAt);
    const observedDate = latestPoll[0].finishedAt.toISOString().slice(0, 10);
    const topLine = makeTopLine(families, observedAt);
    const sixtyDaysAgo = new Date(latestPoll[0].finishedAt);
    sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 59);
    const [dailyRows, events] = await Promise.all([
      db
        .select({
          dateUtc: dailyAvailabilityState.dateUtc,
          available: sql<number>`sum(case when ${dailyAvailabilityState.sawAvailable} and not ${dailyAvailabilityState.sawSoldOut} then 1 else 0 end)`,
          limited: sql<number>`sum(case when ${dailyAvailabilityState.sawAvailable} and ${dailyAvailabilityState.sawSoldOut} then 1 else 0 end)`,
          soldOut: sql<number>`sum(case when ${dailyAvailabilityState.sawSoldOut} and not ${dailyAvailabilityState.sawAvailable} then 1 else 0 end)`,
        })
        .from(dailyAvailabilityState)
        .where(
          gte(
            dailyAvailabilityState.dateUtc,
            sixtyDaysAgo.toISOString().slice(0, 10),
          ),
        )
        .groupBy(dailyAvailabilityState.dateUtc)
        .orderBy(dailyAvailabilityState.dateUtc),
      getDispatchEvents(latestPoll[0].finishedAt),
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
    const supplyHistory = Array.from({ length: 60 }, (_, index) => {
      const date = new Date(`${observedDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - (59 - index));
      const key = date.toISOString().slice(0, 10);
      const day = dailyByDate.get(key);

      return {
        date: key,
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
