import type { CalendarRow } from "@/lib/availability/server-detail";
import { DC_META, STOCK, type Stock } from "@/lib/schema";

const SUMMARY_ORDER: Stock[] = [
    "available",
    "limited",
    "sold-out",
    "not-offered",
    "unknown",
];

// Not offered recedes; unknown (no poll that day) is an empty outline so polling gaps read as gaps.
function cellClass(state: Stock) {
    if (state === "unknown") return "border border-hairline-strong";
    if (state === "not-offered") return `${STOCK[state].bgClass} opacity-40`;
    return STOCK[state].bgClass;
}

function summary(row: CalendarRow) {
    return SUMMARY_ORDER.filter((state) => row.totals[state] > 0)
        .map(
            (state) =>
                `${row.totals[state]} ${row.totals[state] === 1 ? "day" : "days"} ${STOCK[state].label.toLowerCase()}`,
        )
        .join(" · ");
}

export function AvailabilityCalendar({ rows }: { rows: CalendarRow[] }) {
    const first = rows[0]?.days[0]?.date;
    const last = rows[0]?.days.at(-1)?.date;

    return (
        <div className="flex flex-col">
            {rows.map((row, i) => (
                <div
                    key={row.dc}
                    className={`grid grid-cols-1 gap-2 py-3 sm:grid-cols-[88px_1fr] sm:gap-4 ${
                        i > 0 ? "border-t border-hairline" : ""
                    }`}
                >
                    <h3
                        className="text-sm font-medium tracking-[0.08em] text-ink"
                        title={`${DC_META[row.dc].city}, ${DC_META[row.dc].country}`}
                    >
                        {row.dc}
                    </h3>
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <div aria-hidden className="flex h-5 gap-px">
                            {row.days.map((day) => (
                                <span
                                    key={day.date}
                                    title={`${day.date} · ${STOCK[day.state].label}`}
                                    className={`min-w-0 flex-1 ${cellClass(day.state)}`}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-ink-soft tabular-nums">
                            {summary(row)}
                        </p>
                    </div>
                </div>
            ))}
            {first && last ? (
                <p className="pt-2 text-xs text-ink-faint tabular-nums sm:pl-[104px]">
                    {first} to {last}, UTC days. Limited means the server
                    flickered between available and sold out that day.
                </p>
            ) : null}
        </div>
    );
}
