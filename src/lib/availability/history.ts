import { and, desc, eq, gte, lt } from "drizzle-orm";
import { DCS, type DcCode, type Stock } from "@/lib/schema";
import { visibleServerFamilyIds } from "@/lib/server-families";
import { getDbAsync } from "../db/client";
import {
  availabilityCurrent,
  pollRuns,
  serverTypes,
  stockEvents,
} from "../db/schema";
import { HISTORY_GAP_THRESHOLD_SECONDS, POLL_INTERVAL_MS } from "./cadence";

export const HISTORY_WINDOW_DAYS = 14;
export { HISTORY_GAP_THRESHOLD_SECONDS };

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

type CacheEntry = {
  expiresAt: number;
  value: AvailabilityHistory;
};

const SERVER_CACHE_TTL_MS = POLL_INTERVAL_MS;
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
  const db = await getDbAsync();
  const visibleFamilies = visibleServerFamilyIds();
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setUTCDate(windowStart.getUTCDate() - HISTORY_WINDOW_DAYS);
  const startIso = windowStart.toISOString();

  if (visibleFamilies.length === 0) {
    return emptyAvailabilityHistory(type, dc, windowStart, windowEnd);
  }

  const typeRows = await db
    .select({ family: serverTypes.family })
    .from(serverTypes)
    .where(eq(serverTypes.code, type))
    .limit(1);
  if (!typeRows[0] || !visibleFamilies.includes(typeRows[0].family)) {
    return emptyAvailabilityHistory(type, dc, windowStart, windowEnd);
  }

  const [priorEventRows, eventRows, priorPollRows, pollRows] =
    await Promise.all([
      db
        .select({
          observedAt: stockEvents.observedAt,
          baseStatus: stockEvents.baseStatus,
        })
        .from(stockEvents)
        .where(
          and(
            eq(stockEvents.serverTypeCode, type),
            eq(stockEvents.locationCode, dc),
            lt(stockEvents.observedAt, startIso),
          ),
        )
        .orderBy(desc(stockEvents.observedAt))
        .limit(1),
      db
        .select({
          observedAt: stockEvents.observedAt,
          baseStatus: stockEvents.baseStatus,
        })
        .from(stockEvents)
        .where(
          and(
            eq(stockEvents.serverTypeCode, type),
            eq(stockEvents.locationCode, dc),
            gte(stockEvents.observedAt, startIso),
          ),
        )
        .orderBy(stockEvents.observedAt),
      db
        .select({ startedAt: pollRuns.startedAt })
        .from(pollRuns)
        .where(
          and(eq(pollRuns.status, "success"), lt(pollRuns.startedAt, startIso)),
        )
        .orderBy(desc(pollRuns.startedAt))
        .limit(1),
      db
        .select({ startedAt: pollRuns.startedAt })
        .from(pollRuns)
        .where(
          and(
            eq(pollRuns.status, "success"),
            gte(pollRuns.startedAt, startIso),
          ),
        )
        .orderBy(pollRuns.startedAt),
    ]);

  let priorStatus: Stock | null = priorEventRows[0]?.baseStatus ?? null;

  // ponytail: dropped obs; seed prior from current if older than window
  if (priorStatus === null) {
    const cur = await db
      .select({
        baseStatus: availabilityCurrent.baseStatus,
        observedAt: availabilityCurrent.observedAt,
      })
      .from(availabilityCurrent)
      .where(
        and(
          eq(availabilityCurrent.serverTypeCode, type),
          eq(availabilityCurrent.locationCode, dc),
        ),
      )
      .limit(1);
    if (cur[0] && cur[0].observedAt < startIso) {
      priorStatus = cur[0].baseStatus as Stock;
    }
  }

  const events = eventRows.map((row) => ({
    at: toDate(row.observedAt),
    status: row.baseStatus as Stock,
  }));

  if (priorStatus === null && events.length === 0) {
    const cur = await db
      .select({
        baseStatus: availabilityCurrent.baseStatus,
        observedAt: availabilityCurrent.observedAt,
      })
      .from(availabilityCurrent)
      .where(
        and(
          eq(availabilityCurrent.serverTypeCode, type),
          eq(availabilityCurrent.locationCode, dc),
        ),
      )
      .limit(1);
    if (cur[0]) {
      events.push({
        at: toDate(cur[0].observedAt),
        status: cur[0].baseStatus as Stock,
      });
    }
  }

  const pollTimes = [...priorPollRows, ...pollRows].map((row) =>
    toDate(row.startedAt),
  );

  const runs = buildRunsFromEvents(
    windowStart,
    windowEnd,
    priorStatus,
    events,
    pollTimes,
  );
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

function emptyAvailabilityHistory(
  type: string,
  dc: DcCode,
  windowStart: Date,
  windowEnd: Date,
): AvailabilityHistory {
  return {
    type,
    dc,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    runs: [
      {
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
        state: "unknown",
      },
    ],
    totals: emptyTotals(),
    lastChangeAt: null,
  };
}

function buildRunsFromEvents(
  windowStart: Date,
  windowEnd: Date,
  priorStatus: Stock | null,
  events: { at: Date; status: Stock }[],
  pollTimes: Date[],
): HistoryRun[] {
  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();

  if (priorStatus === null && events.length === 0) {
    return [
      {
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
        state: "unknown",
      },
    ];
  }

  type Mark = { at: number; status: Stock };
  const marks: Mark[] = [];

  if (priorStatus !== null) {
    marks.push({ at: startMs, status: priorStatus });
  } else {
    marks.push({ at: startMs, status: "unknown" });
  }

  for (const event of events) {
    const at = event.at.getTime();
    if (at < startMs || at > endMs) continue;
    const last = marks[marks.length - 1];
    if (last && last.status === event.status) continue;
    marks.push({ at, status: event.status });
  }

  let runs: HistoryRun[] = [];
  for (let i = 0; i < marks.length; i++) {
    const from = marks[i].at;
    const to = i + 1 < marks.length ? marks[i + 1].at : endMs;
    if (to <= from) continue;
    runs.push({
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      state: marks[i].status,
    });
  }

  const gapMs = HISTORY_GAP_THRESHOLD_SECONDS * 1000;
  for (let i = 1; i < pollTimes.length; i++) {
    const prev = pollTimes[i - 1].getTime();
    const curr = pollTimes[i].getTime();
    if (curr - prev <= gapMs) continue;
    runs = punchUnknown(runs, prev + gapMs, curr);
  }

  if (pollTimes.length > 0) {
    const lastPoll = pollTimes[pollTimes.length - 1].getTime();
    if (endMs - lastPoll > gapMs) {
      runs = punchUnknown(runs, lastPoll + gapMs, endMs);
    }
  }

  return mergeAdjacent(runs);
}

function punchUnknown(
  runs: HistoryRun[],
  gapFrom: number,
  gapTo: number,
): HistoryRun[] {
  if (gapTo <= gapFrom) return runs;

  const out: HistoryRun[] = [];
  let emittedUnknown = false;

  const emitUnknown = () => {
    if (emittedUnknown) return;
    out.push({
      from: new Date(gapFrom).toISOString(),
      to: new Date(gapTo).toISOString(),
      state: "unknown",
    });
    emittedUnknown = true;
  };

  for (const run of runs) {
    const a = new Date(run.from).getTime();
    const b = new Date(run.to).getTime();

    if (b <= gapFrom || a >= gapTo) {
      out.push(run);
      continue;
    }

    if (a < gapFrom) {
      out.push({
        from: run.from,
        to: new Date(gapFrom).toISOString(),
        state: run.state,
      });
    }

    emitUnknown();

    if (b > gapTo) {
      out.push({
        from: new Date(gapTo).toISOString(),
        to: run.to,
        state: run.state,
      });
    }
  }

  if (!emittedUnknown) emitUnknown();

  return out;
}

function mergeAdjacent(runs: HistoryRun[]): HistoryRun[] {
  if (runs.length === 0) return runs;

  const out: HistoryRun[] = [{ ...runs[0] }];
  for (let i = 1; i < runs.length; i++) {
    const prev = out[out.length - 1];
    const cur = runs[i];
    if (prev.state === cur.state && prev.to === cur.from) {
      prev.to = cur.to;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}
