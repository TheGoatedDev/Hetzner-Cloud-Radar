import { describe, expect, it } from "vitest";
import { toDispatchEvents } from "./read-model";

const row = (
    observedAt: string,
    baseStatus: "available" | "sold-out",
    prevStatus: "available" | "sold-out",
    currentStatus: "available" | "sold-out",
) => ({
    observedAt,
    serverTypeCode: "CCX13",
    locationCode: "FSN1",
    baseStatus,
    prevStatus,
    previousSoldOutAt: null,
    currentStatus,
});

describe("toDispatchEvents", () => {
    it("only treats the latest sold-out event per cell as ongoing", () => {
        const latestAt = new Date("2026-11-22T21:00:00Z");
        // Newest first, as the query orders them. The cell is sold out again now.
        const events = toDispatchEvents(
            [
                row(
                    "2026-11-22T00:00:00Z",
                    "sold-out",
                    "available",
                    "sold-out",
                ),
                row(
                    "2026-10-18T00:00:00Z",
                    "available",
                    "sold-out",
                    "sold-out",
                ),
                row(
                    "2026-10-17T00:00:00Z",
                    "sold-out",
                    "available",
                    "sold-out",
                ),
            ],
            latestAt,
            10,
        );

        expect(events.map((e) => [e.startedAt, e.state])).toEqual([
            ["Nov 22, 00:00 UTC", "ongoing-out"],
            ["Oct 18, 00:00 UTC", "resolved-restock"],
        ]);
    });
});
