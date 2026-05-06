import { formatChartLabel } from "@/lib/chart";
import type { SupplyDay } from "@/lib/schema";
import { SectionHeader } from "../section-header";
import { SupplyChart } from "../supply-chart";

export function SupplyTrend({ days }: { days: SupplyDay[] }) {
  const peakDay = days.reduce((a, b) =>
    a.available + a.limited + a.soldOut >= b.available + b.limited + b.soldOut
      ? a
      : b,
  );
  const peakValue = peakDay.available + peakDay.limited + peakDay.soldOut;

  return (
    <section className="flex flex-col gap-5 pt-10">
      <SectionHeader
        kicker={`Last ${days.length} days`}
        title="Supply history"
        blurb="Daily count of observed cells grouped by available, flickering, and sold-out states."
      />
      <SupplyChart days={days} />
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-xs text-ink-soft">
        <span className="flex items-baseline gap-2">
          <span aria-hidden className="inline-block h-2.5 w-3 bg-operational" />
          <span>Available</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span aria-hidden className="inline-block h-2.5 w-3 bg-degraded" />
          <span>Limited (flickered)</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span aria-hidden className="inline-block h-2.5 w-3 bg-down" />
          <span>Sold out</span>
        </span>
        <span className="ml-auto text-ink-faint">
          Peak <span className="text-ink tabular-nums">{peakValue}</span> on{" "}
          <span className="text-ink tabular-nums">
            {formatChartLabel(peakDay.date)}
          </span>
        </span>
      </div>
    </section>
  );
}
