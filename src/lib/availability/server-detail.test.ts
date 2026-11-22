import { describe, expect, it } from "vitest";
import {
    buildCalendar,
    computeDcStats,
    offeredDcs,
    readServerTypeDetails,
} from "./server-detail";

describe("readServerTypeDetails", () => {
    it("parses Hetzner server type fields and prices per datacentre", () => {
        const details = readServerTypeDetails({
            description: "CX23",
            cpu_type: "shared",
            storage_type: "local",
            category: "cost_optimized",
            deprecation: null,
            prices: [
                {
                    location: "fsn1",
                    price_hourly: {
                        net: "0.0048",
                        gross: "0.0057120000000000",
                    },
                    price_monthly: { net: "2.99", gross: "3.5581000000000000" },
                    included_traffic: 21990232555520,
                    price_per_tb_traffic: { net: "1.00", gross: "1.19" },
                },
                { location: "mars1", price_monthly: { gross: "1" } },
            ],
        });

        expect(details).toEqual({
            description: "CX23",
            cpuType: "shared",
            storageType: "local",
            category: "cost_optimized",
            deprecation: null,
            prices: {
                FSN1: {
                    monthly: "3.56",
                    hourly: "0.0057",
                    includedTrafficTb: 20,
                    perTbTraffic: "1.19",
                },
            },
        });
    });

    it("reads deprecation dates", () => {
        expect(
            readServerTypeDetails({
                deprecation: {
                    announced: "2025-09-01T00:00:00Z",
                    unavailable_after: "2025-12-31T00:00:00Z",
                },
            }).deprecation,
        ).toEqual({
            announced: "2025-09-01T00:00:00Z",
            unavailableAfter: "2025-12-31T00:00:00Z",
        });
    });

    it("tolerates missing or malformed raw data", () => {
        expect(readServerTypeDetails(null)).toEqual({
            description: null,
            cpuType: null,
            storageType: null,
            category: null,
            deprecation: null,
            prices: {},
        });
        expect(
            readServerTypeDetails({
                prices: [{ location: "nbg1", price_monthly: { gross: "abc" } }],
            }).prices,
        ).toEqual({
            NBG1: {
                monthly: null,
                hourly: null,
                includedTrafficTb: null,
                perTbTraffic: null,
            },
        });
    });
});

describe("buildCalendar", () => {
    const row = (
        dateUtc: string,
        locationCode: string,
        sawAvailable: boolean,
        sawSoldOut: boolean,
    ) => ({ dateUtc, locationCode, sawAvailable, sawSoldOut });

    it("builds 60 UTC days per datacentre ending at the end date", () => {
        const calendar = buildCalendar([], "2026-03-01");
        expect(calendar.map((r) => r.dc)).toEqual([
            "NBG1",
            "FSN1",
            "HEL1",
            "ASH",
            "HIL",
            "SIN",
        ]);
        const days = calendar[0]?.days ?? [];
        expect(days).toHaveLength(60);
        expect(days[0]?.date).toBe("2026-01-01");
        expect(days[59]?.date).toBe("2026-03-01");
        expect(calendar[0]?.totals.unknown).toBe(60);
    });

    it("maps daily flags to states and counts them", () => {
        const [nbg] = buildCalendar(
            [
                row("2026-03-01", "NBG1", true, false),
                row("2026-02-28", "NBG1", true, true),
                row("2026-02-27", "NBG1", false, true),
                row("2026-02-26", "NBG1", false, false),
                row("2026-02-25", "FSN1", false, true),
            ],
            "2026-03-01",
        );
        expect(nbg?.days.slice(-5).map((d) => d.state)).toEqual([
            "unknown",
            "not-offered",
            "sold-out",
            "limited",
            "available",
        ]);
        expect(nbg?.totals).toEqual({
            available: 1,
            limited: 1,
            "sold-out": 1,
            "not-offered": 1,
            unknown: 56,
        });
    });
});

describe("computeDcStats", () => {
    const start = new Date("2026-03-01T00:00:00Z");
    const end = new Date("2026-03-11T00:00:00Z");
    const day = 86_400_000;
    const change = (
        observedAt: string,
        baseStatus: "available" | "sold-out" | "not-offered" | "unknown",
        prevStatus: typeof baseStatus | null,
        locationCode = "FSN1",
    ) => ({ observedAt, locationCode, baseStatus, prevStatus });

    it("uses the current status when nothing changed in the window", () => {
        expect(computeDcStats("FSN1", [], "available", start, end)).toEqual({
            dc: "FSN1",
            availablePct: 100,
            soldOutRuns: 0,
            longestSoldOutMs: 0,
            avgSoldOutMs: 0,
            soldOutNow: false,
            lastChangeAt: null,
        });
        expect(
            computeDcStats("FSN1", [], "not-offered", start, end).availablePct,
        ).toBeNull();
    });

    it("measures closed and ongoing sold-out runs", () => {
        const stats = computeDcStats(
            "FSN1",
            [
                change("2026-03-02T00:00:00Z", "sold-out", "available"),
                change("2026-03-04T00:00:00Z", "available", "sold-out"),
                change("2026-03-10T00:00:00Z", "sold-out", "available"),
                change("2026-03-05T00:00:00Z", "sold-out", "available", "NBG1"),
            ],
            "sold-out",
            start,
            end,
        );
        expect(stats).toEqual({
            dc: "FSN1",
            availablePct: 70,
            soldOutRuns: 2,
            longestSoldOutMs: 2 * day,
            avgSoldOutMs: 1.5 * day,
            soldOutNow: true,
            lastChangeAt: "2026-03-10T00:00:00Z",
        });
    });

    it("counts a run that started before the window", () => {
        const stats = computeDcStats(
            "FSN1",
            [change("2026-03-03T00:00:00Z", "available", "sold-out")],
            "available",
            start,
            end,
        );
        expect(stats.soldOutRuns).toBe(1);
        expect(stats.longestSoldOutMs).toBe(2 * day);
        expect(stats.availablePct).toBe(80);
    });

    it("excludes unknown time from the availability share", () => {
        const stats = computeDcStats(
            "FSN1",
            [change("2026-03-06T00:00:00Z", "available", null)],
            "available",
            start,
            end,
        );
        expect(stats.availablePct).toBe(100);
    });
});

describe("offeredDcs", () => {
    const current = (stocks: Partial<Record<string, string>>) =>
        Object.fromEntries(
            ["NBG1", "FSN1", "HEL1", "ASH", "HIL", "SIN"].map((dc) => [
                dc,
                { stock: stocks[dc] ?? "not-offered", observedAt: null },
            ]),
        ) as Parameters<typeof offeredDcs>[0];

    it("keeps datacentres offered now or on any day in the window", () => {
        const calendar = buildCalendar(
            [
                {
                    dateUtc: "2026-02-10",
                    locationCode: "ASH",
                    sawAvailable: false,
                    sawSoldOut: true,
                },
                {
                    dateUtc: "2026-02-11",
                    locationCode: "SIN",
                    sawAvailable: false,
                    sawSoldOut: false,
                },
            ],
            "2026-03-01",
        );
        expect(
            offeredDcs(
                current({ NBG1: "sold-out", HEL1: "limited" }),
                calendar,
            ),
        ).toEqual(["NBG1", "HEL1", "ASH"]);
    });

    it("falls back to every datacentre when never offered", () => {
        expect(
            offeredDcs(current({}), buildCalendar([], "2026-03-01")),
        ).toHaveLength(6);
    });
});
