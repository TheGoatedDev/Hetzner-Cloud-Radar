import { describe, expect, it } from "vitest";
import { readServerTypeDetails } from "./server-detail";

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
