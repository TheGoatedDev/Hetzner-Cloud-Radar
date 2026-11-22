import { describe, expect, it } from "vitest";
import {
    buildCalendar,
    computeDcStats,
    readServerTypeDetails,
    type ServerDetail,
} from "@/lib/availability/server-detail";
import { DCS } from "@/lib/schema";
import { renderServerMd } from "./pages";

const start = new Date("2026-01-01T00:00:00Z");
const end = new Date("2026-03-01T00:00:00Z");

const detail: ServerDetail = {
    code: "CX23",
    family: { id: "cx", label: "CX", kicker: "Shared Intel" },
    cores: 2,
    memoryGb: 4,
    diskGb: 40,
    architecture: "x86",
    details: readServerTypeDetails({
        cpu_type: "shared",
        storage_type: "local",
        prices: [
            {
                location: "fsn1",
                price_monthly: { gross: "4.5" },
                price_hourly: { gross: "0.0072" },
                included_traffic: 21990232555520,
            },
        ],
    }),
    current: Object.fromEntries(
        DCS.map((dc) => [
            dc,
            {
                stock: dc === "FSN1" ? "sold-out" : "available",
                observedAt: null,
            },
        ]),
    ) as ServerDetail["current"],
    latestPollAt: end.toISOString(),
    calendar: buildCalendar(
        [
            {
                dateUtc: "2026-03-01",
                locationCode: "FSN1",
                sawAvailable: false,
                sawSoldOut: true,
            },
        ],
        "2026-03-01",
    ),
    stats: DCS.map((dc) =>
        computeDcStats(
            dc,
            [
                {
                    observedAt: "2026-02-28T00:00:00Z",
                    locationCode: "FSN1",
                    baseStatus: "sold-out",
                    prevStatus: "available",
                },
            ],
            "available",
            start,
            end,
        ),
    ),
    events: [],
};

describe("renderServerMd", () => {
    it("renders specs, prices, calendar, stats and empty events", () => {
        const md = renderServerMd(detail, "2026-03-01 00:00:00 UTC");

        expect(md).toContain("# CX23");
        expect(md).toContain(
            "CX · Shared Intel. 2 vCPU · 4 GB RAM · 40 GB disk. Architecture x86, CPU shared, storage local.",
        );
        expect(md).toContain("| FSN1 | Sold out | 4.50 | 0.0072 | 20 TB |");
        expect(md).toContain("| NBG1 | Available | - | - | - |");
        expect(md).toContain("- FSN1: 1 sold out, 59 unknown");
        expect(md).toContain(
            "| FSN1 | 98.3% | 1 (now) | 1d 0h | 1d 0h | 2026-02-28 |",
        );
        expect(md).toContain("No stock changes for CX23 in the last 60 days.");
    });
});
