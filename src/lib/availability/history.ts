import { DCS, type DcCode, type Stock } from "@/lib/schema";
import { getSql } from "../db/client";

export const HISTORY_WINDOW_DAYS = 14;
export const HISTORY_GAP_THRESHOLD_SECONDS = 180;

export type HistoryRun = {
  from: string;
  to: string;
  state: Stock;
};

export type AvailabilityHistory = {
  type: string;
  dc: DcCode;
  windowStart: string;
  windowEnd: string;
  runs: HistoryRun[];
  totals: Record<Stock, number>;
  lastChangeAt: string | null;
};

type ObservationRow = {
  observed_at: Date | string;
  base_status: "available" | "sold-out" | "not-offered" | "unknown";
  prev_at: Date | string | null;
  prev_status: "available" | "sold-out" | "not-offered" | "unknown" | null;
};

type CacheEntry = {
  expiresAt: number;
  value: AvailabilityHistory;
};

const SERVER_CACHE_TTL_MS = 60_000;
const serverCache = new Map<string, CacheEntry>();

function cacheKey(type: string, dc: DcCode) {
  return `${type}:${dc}`;
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function emptyTotals(): Record<Stock, number> {
  return {
    available: 0,
    limited: 0,
    "sold-out": 0,
    "not-offered": 0,
    unknown: 0,
  };
}

export function isValidDc(dc: string): dc is DcCode {
  return (DCS as readonly string[]).includes(dc);
}

export async function getAvailabilityHistory(
  type: string,
  dc: DcCode,
): Promise<AvailabilityHistory> {
  const key = cacheKey(type, dc);
  const now = Date.now();
  const cached = serverCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await loadAvailabilityHistory(type, dc);
  serverCache.set(key, { expiresAt: now + SERVER_CACHE_TTL_MS, value });

  return value;
}

async function loadAvailabilityHistory(
  type: string,
  dc: DcCode,
): Promise<AvailabilityHistory> {
  const rawSql = getSql();
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setUTCDate(windowStart.getUTCDate() - HISTORY_WINDOW_DAYS);

  const rows = await rawSql<ObservationRow[]>`
    with obs as (
      select
        observed_at,
        base_status,
        lag(observed_at) over w as prev_at,
        lag(base_status) over w as prev_status
      from availability_observations
      where server_type_code = ${type}
        and location_code = ${dc}
        and observed_at >= ${windowStart.toISOString()}
      window w as (order by observed_at)
    )
    select observed_at, base_status, prev_at, prev_status
    from obs
    where prev_at is null
      or prev_status is distinct from base_status
      or extract(epoch from (observed_at - prev_at)) > ${HISTORY_GAP_THRESHOLD_SECONDS}
    order by observed_at
  `;

  const runs = buildRuns(rows, windowStart, windowEnd);
  const totals = emptyTotals();
  let lastChangeAt: string | null = null;
  let prevState: Stock | null = null;

  for (const run of runs) {
    const durationMs =
      new Date(run.to).getTime() - new Date(run.from).getTime();
    totals[run.state] += Math.max(0, Math.round(durationMs / 1000));
    if (prevState !== null && prevState !== run.state) {
      lastChangeAt = run.from;
    }
    prevState = run.state;
  }

  return {
    type,
    dc,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    runs,
    totals,
    lastChangeAt,
  };
}

function buildRuns(
  rows: ObservationRow[],
  windowStart: Date,
  windowEnd: Date,
): HistoryRun[] {
  if (rows.length === 0) {
    return [
      {
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
        state: "unknown",
      },
    ];
  }

  const runs: HistoryRun[] = [];
  let currentState: Stock = "unknown";
  let currentFrom: Date = windowStart;

  const pushRun = (to: Date) => {
    if (to.getTime() <= currentFrom.getTime()) return;
    runs.push({
      from: currentFrom.toISOString(),
      to: to.toISOString(),
      state: currentState,
    });
  };

  for (const row of rows) {
    const observedAt = toDate(row.observed_at);
    const prevAt = row.prev_at ? toDate(row.prev_at) : null;
    const gapSeconds = prevAt
      ? (observedAt.getTime() - prevAt.getTime()) / 1000
      : null;

    if (prevAt && gapSeconds && gapSeconds > HISTORY_GAP_THRESHOLD_SECONDS) {
      const gapStart = new Date(
        prevAt.getTime() + HISTORY_GAP_THRESHOLD_SECONDS * 1000,
      );
      pushRun(gapStart);
      currentState = "unknown";
      currentFrom = gapStart;
      pushRun(observedAt);
      currentState = row.base_status;
      currentFrom = observedAt;
      continue;
    }

    pushRun(observedAt);
    currentState = row.base_status;
    currentFrom = observedAt;
  }

  pushRun(windowEnd);

  return runs;
}
