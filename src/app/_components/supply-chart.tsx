import { formatChartLabel } from "@/lib/chart";
import type { SupplyDay } from "@/lib/schema";

const W = 600;
const H = 100;
const GAP = 1;

export function SupplyChart({ days }: { days: SupplyDay[] }) {
  const barW = (W - (days.length - 1) * GAP) / days.length;
  const maxStack = Math.max(
    ...days.map((d) => d.available + d.limited + d.soldOut),
    1,
  );
  const yScale = (v: number) => (v / maxStack) * H;

  const tickIndices = [
    0,
    Math.floor((days.length - 1) * 0.25),
    Math.floor((days.length - 1) * 0.5),
    Math.floor((days.length - 1) * 0.75),
    days.length - 1,
  ];

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Available, limited, and sold-out cells per day, last ${days.length} days. Maximum ${maxStack} cells.`}
      >
        <line
          x1={0}
          y1={H}
          x2={W}
          y2={H}
          stroke="var(--hairline-strong)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {days.map((d, i) => {
          const x = i * (barW + GAP);
          const availableH = yScale(d.available);
          const limitedH = yScale(d.limited);
          const soldOutH = yScale(d.soldOut);
          const totalH = availableH + limitedH + soldOutH;
          if (totalH === 0) return null;
          return (
            <g key={d.date}>
              <title>{`${formatChartLabel(d.date)}: ${d.available} available, ${d.limited} limited, ${d.soldOut} sold out`}</title>
              {d.available > 0 ? (
                <rect
                  x={x}
                  y={H - availableH}
                  width={barW}
                  height={availableH}
                  fill="var(--status-operational)"
                />
              ) : null}
              {d.limited > 0 ? (
                <rect
                  x={x}
                  y={H - availableH - limitedH}
                  width={barW}
                  height={limitedH}
                  fill="var(--status-degraded)"
                />
              ) : null}
              {d.soldOut > 0 ? (
                <rect
                  x={x}
                  y={H - totalH}
                  width={barW}
                  height={soldOutH}
                  fill="var(--status-down)"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="grid grid-cols-5 text-[10px] tabular-nums text-ink-faint">
        {tickIndices.map((idx, i) => (
          <span
            key={idx}
            className={
              i === 0
                ? "text-left"
                : i === tickIndices.length - 1
                  ? "text-right"
                  : "text-center"
            }
          >
            {formatChartLabel(days[idx].date)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
