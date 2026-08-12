import {
  formatChartLabel,
  STOCK,
  SUPPLY_SERIES,
  type SupplyDay,
  sumSupplyDay,
} from "@/lib/schema";
import { SectionHeader } from "../section-header";
import { SupplyChart } from "../supply-chart";

export function SupplyTrend({ days }: { days: SupplyDay[] }) {
  const peakDay = days.reduce((a, b) =>
    sumSupplyDay(a) >= sumSupplyDay(b) ? a : b,
  );
  const peakValue = sumSupplyDay(peakDay);

  return (
    <section className="flex flex-col gap-5 pt-10">
      <SectionHeader
        kicker={`Last ${days.length} days`}
        title="Supply history"
        blurb="Daily count of observed cells grouped by available, flickering, and sold-out states."
      />
      <SupplyChart days={days} />
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-xs text-ink-soft">
        {SUPPLY_SERIES.map((series) => (
          <span key={series.key} className="flex items-baseline gap-2">
            <span
              aria-hidden
              className={`inline-block h-2.5 w-3 ${STOCK[series.stock].bgClass}`}
            />
            <span>
              {"label" in series ? series.label : STOCK[series.stock].label}
            </span>
          </span>
        ))}
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
