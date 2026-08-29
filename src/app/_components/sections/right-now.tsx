import { STOCK, type Stock } from "@/lib/schema";
import { Eyebrow } from "../eyebrow";
import { StockGlyph } from "../stock-glyph";

type Totals = {
    tracked: number;
    available: number;
    limited: number;
    soldOut: number;
    notOffered: number;
};

function Counter({
    label,
    value,
    delta,
}: {
    label: string;
    value: number;
    delta?: string;
}) {
    return (
        <div className="flex items-baseline gap-2">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="text-ink tabular-nums">
                {value}
                {delta ? (
                    <span className="ml-2 text-ink-faint tabular-nums">
                        {delta}
                    </span>
                ) : null}
            </dd>
        </div>
    );
}

export function RightNow({
    totals,
    topLine,
    observedAt,
}: {
    totals: Totals;
    topLine: { state: Stock; line: string };
    observedAt: string;
}) {
    const soldOutDelta = totals.soldOut > 0 ? undefined : "0";

    return (
        <section className="flex flex-col gap-5 border-b border-hairline pt-8 pb-10">
            <Eyebrow>Right now</Eyebrow>
            <div className="flex items-baseline gap-4">
                <StockGlyph stock={topLine.state} />
                <span
                    className={`text-xs font-medium uppercase tracking-[0.12em] ${STOCK[topLine.state].textClass}`}
                >
                    {STOCK[topLine.state].label}
                </span>
                <span className="text-xs text-ink-faint tabular-nums">
                    as of {observedAt}
                </span>
            </div>
            <h1 className="max-w-[68ch] break-words font-sans text-lg font-normal leading-[1.55] text-pretty text-ink">
                {topLine.line}
            </h1>
            <dl className="mt-1 flex flex-wrap gap-x-10 gap-y-2 text-xs">
                <Counter label="Tracked" value={totals.tracked} />
                <Counter
                    label="Available"
                    value={totals.available}
                    delta={`(${Math.round((totals.available / totals.tracked) * 100)}%)`}
                />
                <Counter label="Limited today" value={totals.limited} />
                <Counter
                    label="Sold out"
                    value={totals.soldOut}
                    delta={soldOutDelta}
                />
                <Counter label="Not offered" value={totals.notOffered} />
            </dl>
        </section>
    );
}
