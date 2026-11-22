import { and, desc, eq, gte } from "drizzle-orm";
import { DCS, type DcCode, type Stock } from "@/lib/schema";
import { getDb } from "../db/client";
import {
    availabilityCurrent,
    dailyAvailabilityState,
    pollRuns,
    serverTypes,
} from "../db/schema";
import { getPublicServerFamilies } from "./discovery";

export type DcPrice = {
    monthly: string | null;
    hourly: string | null;
    includedTrafficTb: number | null;
    perTbTraffic: string | null;
};

export type ServerTypeDetails = {
    description: string | null;
    cpuType: string | null;
    storageType: string | null;
    category: string | null;
    deprecation: {
        announced: string | null;
        unavailableAfter: string | null;
    } | null;
    prices: Partial<Record<DcCode, DcPrice>>;
};

export type ServerDetail = {
    code: string;
    family: { id: string; label: string; kicker: string };
    cores: number;
    memoryGb: number;
    diskGb: number;
    architecture: string;
    details: ServerTypeDetails;
    current: Record<DcCode, { stock: Stock; observedAt: string | null }>;
    latestPollAt: string | null;
    calendar: CalendarRow[];
};

export const CALENDAR_DAYS = 60;

export type CalendarRow = {
    dc: DcCode;
    days: { date: string; state: Stock }[];
    totals: Record<Stock, number>;
};

type DailyRow = {
    dateUtc: string;
    locationCode: string;
    sawAvailable: boolean;
    sawSoldOut: boolean;
};

function dayState(row: DailyRow | undefined): Stock {
    if (!row) return "unknown";
    if (row.sawAvailable && row.sawSoldOut) return "limited";
    if (row.sawSoldOut) return "sold-out";
    if (row.sawAvailable) return "available";
    // Polled that day but neither available nor sold out: not offered.
    return "not-offered";
}

export function calendarStartDate(endDate: string) {
    const start = new Date(`${endDate}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - (CALENDAR_DAYS - 1));
    return start.toISOString().slice(0, 10);
}

// One row per datacentre, CALENDAR_DAYS UTC days ending at endDate (YYYY-MM-DD).
export function buildCalendar(
    rows: DailyRow[],
    endDate: string,
): CalendarRow[] {
    const byKey = new Map(
        rows.map((row) => [`${row.locationCode}:${row.dateUtc}`, row]),
    );
    const start = new Date(`${calendarStartDate(endDate)}T00:00:00Z`);
    const dates = Array.from({ length: CALENDAR_DAYS }, (_, i) => {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + i);
        return date.toISOString().slice(0, 10);
    });

    return DCS.map((dc) => {
        const totals: Record<Stock, number> = {
            available: 0,
            limited: 0,
            "sold-out": 0,
            "not-offered": 0,
            unknown: 0,
        };
        const days = dates.map((date) => {
            const state = dayState(byKey.get(`${dc}:${date}`));
            totals[state] += 1;
            return { date, state };
        });
        return { dc, days, totals };
    });
}

function obj(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function str(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

function money(value: unknown, digits: number): string | null {
    const gross = str(obj(value)?.gross);
    const n = gross === null ? Number.NaN : Number(gross);
    return Number.isFinite(n) ? n.toFixed(digits) : null;
}

function isDc(code: string): code is DcCode {
    return (DCS as readonly string[]).includes(code);
}

// Parses the Hetzner /v1/server_types item stored in server_types.raw. Missing fields become null.
export function readServerTypeDetails(raw: unknown): ServerTypeDetails {
    const record = obj(raw) ?? {};
    const deprecation = obj(record.deprecation);
    const prices: Partial<Record<DcCode, DcPrice>> = {};

    for (const item of Array.isArray(record.prices) ? record.prices : []) {
        const price = obj(item);
        const dc = str(price?.location)?.toUpperCase();
        if (!price || !dc || !isDc(dc)) continue;
        const traffic = price.included_traffic;
        prices[dc] = {
            monthly: money(price.price_monthly, 2),
            hourly: money(price.price_hourly, 4),
            includedTrafficTb:
                typeof traffic === "number" && traffic > 0
                    ? Math.round(traffic / 1024 ** 4)
                    : null,
            perTbTraffic: money(price.price_per_tb_traffic, 2),
        };
    }

    return {
        description: str(record.description),
        cpuType: str(record.cpu_type),
        storageType: str(record.storage_type),
        category: str(record.category),
        deprecation: deprecation
            ? {
                  announced: str(deprecation.announced),
                  unavailableAfter: str(deprecation.unavailable_after),
              }
            : null,
        prices,
    };
}

function isMissingFromApi(raw: unknown) {
    return obj(raw)?.missingFromApi === true;
}

// Visible, active server type codes, for generateStaticParams and the sitemap.
export async function getServerCodes(): Promise<string[]> {
    try {
        const db = await getDb();
        const [rows, families] = await Promise.all([
            db
                .select({
                    code: serverTypes.code,
                    family: serverTypes.family,
                    raw: serverTypes.raw,
                })
                .from(serverTypes),
            getPublicServerFamilies(),
        ]);
        const visible = new Set(families.map(({ id }) => id));
        return rows
            .filter((r) => visible.has(r.family) && !isMissingFromApi(r.raw))
            .map((r) => r.code);
    } catch (error) {
        // Build/prerender has no DB.
        console.error("Server code lookup failed", error);
        return [];
    }
}

export async function getServerDetail(
    rawCode: string,
): Promise<ServerDetail | null> {
    const code = rawCode.toUpperCase();
    if (!/^[A-Z]+\d+[A-Z]*$/u.test(code) || code.length > 16) return null;

    const db = await getDb();
    const [typeRows, families, currentRows, latestPoll] = await Promise.all([
        db
            .select()
            .from(serverTypes)
            .where(eq(serverTypes.code, code))
            .limit(1),
        getPublicServerFamilies(),
        db
            .select()
            .from(availabilityCurrent)
            .where(eq(availabilityCurrent.serverTypeCode, code)),
        db
            .select({ finishedAt: pollRuns.finishedAt })
            .from(pollRuns)
            .where(eq(pollRuns.status, "success"))
            .orderBy(desc(pollRuns.finishedAt))
            .limit(1),
    ]);
    const type = typeRows[0];
    const family = families.find(({ id }) => id === type?.family);
    if (!type || !family || isMissingFromApi(type.raw)) return null;

    const latestPollAt = latestPoll[0]?.finishedAt ?? null;
    const endDate = (latestPollAt ?? new Date().toISOString()).slice(0, 10);
    const dailyRows = await db
        .select({
            dateUtc: dailyAvailabilityState.dateUtc,
            locationCode: dailyAvailabilityState.locationCode,
            sawAvailable: dailyAvailabilityState.sawAvailable,
            sawSoldOut: dailyAvailabilityState.sawSoldOut,
        })
        .from(dailyAvailabilityState)
        .where(
            and(
                eq(dailyAvailabilityState.serverTypeCode, code),
                gte(dailyAvailabilityState.dateUtc, calendarStartDate(endDate)),
            ),
        );

    const currentByDc = new Map(
        currentRows.map((r) => [r.locationCode, r] as const),
    );
    const current = Object.fromEntries(
        DCS.map((dc) => {
            const row = currentByDc.get(dc);
            return [
                dc,
                {
                    stock:
                        (row?.displayStatus as Stock | undefined) ?? "unknown",
                    observedAt: row?.observedAt ?? null,
                },
            ];
        }),
    ) as ServerDetail["current"];

    return {
        code,
        family: { id: family.id, label: family.label, kicker: family.kicker },
        cores: type.cores,
        memoryGb: type.memoryGb,
        diskGb: type.diskGb,
        architecture: type.architecture,
        details: readServerTypeDetails(type.raw),
        current,
        latestPollAt,
        calendar: buildCalendar(dailyRows, endDate),
    };
}
