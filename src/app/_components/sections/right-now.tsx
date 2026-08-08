import { STOCK, type Stock } from "@/lib/schema";
import { Counter } from "../counter";
import { Eyebrow } from "../eyebrow";
import { StockGlyph } from "../stock-glyph";

type Totals = {
  tracked: number;
  available: number;
  limited: number;
  soldOut: number;
  notOffered: number;
};

type TopLine = {
  state: Stock;
  line: string;
};

export function RightNow({
  totals,
  topLine,
  observedAt,
}: {
  totals: Totals;
  topLine: TopLine;
  observedAt: string;
}) {
  const soldOutDelta = totals.soldOut > 0 ? undefined : "0";

  return (
    <section className="flex flex-col gap-5 border-b border-hairline pt-8 pb-10">
      <Eyebrow>Right now</Eyebrow>
      <h1 className="font-sans text-2xl font-medium tracking-tight text-ink">
        Hetzner Cloud server availability
      </h1>
      <div className="flex items-baseline gap-4">
        <StockGlyph stock={topLine.state} />
        <span
          className={`text-xs font-medium uppercase tracking-[0.12em] ${STOCK[topLine.state].textClass}`}
        >
          Tight supply
        </span>
        <span className="text-xs text-ink-faint tabular-nums">
          as of {observedAt}
        </span>
      </div>
      <p className="max-w-[68ch] font-sans text-lg leading-[1.55] text-ink">
        {topLine.line}
      </p>
      <dl className="mt-1 flex flex-wrap gap-x-10 gap-y-2 text-xs">
        <Counter label="Tracked" value={totals.tracked} />
        <Counter
          label="Available"
          value={totals.available}
          delta={`(${Math.round((totals.available / totals.tracked) * 100)}%)`}
        />
        <Counter label="Limited today" value={totals.limited} />
        <Counter label="Sold out" value={totals.soldOut} delta={soldOutDelta} />
        <Counter label="Not offered" value={totals.notOffered} />
      </dl>
    </section>
  );
}
