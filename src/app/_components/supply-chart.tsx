"use client";

import { type PointerEvent as ReactPointerEvent, useState } from "react";
import {
  formatChartLabel,
  STOCK,
  SUPPLY_SERIES,
  type SupplyDay,
  sumSupplyDay,
} from "@/lib/schema";

const W = 600;
const H = 100;
const GAP = 1;

function availableStats(days: SupplyDay[]) {
  const values = days
    .filter((day) => sumSupplyDay(day) > 0)
    .map((day) => day.available);
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    average: values.length > 0 ? total / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
  };
}

function formatSupplyStat(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatAverageDelta(value: number, average: number) {
  const delta = value - average;

  if (Math.abs(delta) < 0.05) return "avg";

  return `${delta > 0 ? "+" : ""}${formatSupplyStat(delta)} vs avg`;
}

function tooltipAnchor(index: number, total: number) {
  const ratio = index / Math.max(total - 1, 1);
  if (ratio < 0.1) return { transform: "translate(0, -100%)", offsetX: -4 };
  if (ratio > 0.9) return { transform: "translate(-100%, -100%)", offsetX: 4 };
  return { transform: "translate(-50%, -100%)", offsetX: 0 };
}

export function SupplyChart({ days }: { days: SupplyDay[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const barW = (W - (days.length - 1) * GAP) / days.length;
  const maxStack = Math.max(...days.map(sumSupplyDay), 1);
  const yScale = (v: number) => (v / maxStack) * H;
  const stats = availableStats(days);
  const statLines = [
    {
      key: "avg",
      label: `Available avg ${formatSupplyStat(stats.average)}`,
      value: stats.average,
      opacity: 0.85,
      dash: "4 3",
      width: 1,
    },
    {
      key: "min",
      label: `Available min ${stats.min}`,
      value: stats.min,
      opacity: 0.42,
      dash: "1 3",
      width: 0.8,
    },
    {
      key: "max",
      label: `Available max ${stats.max}`,
      value: stats.max,
      opacity: 0.42,
      dash: "1 3",
      width: 0.8,
    },
  ].filter(
    (line, index, lines) =>
      index === lines.findIndex((candidate) => candidate.value === line.value),
  );

  const tickIndices = [
    0,
    Math.floor((days.length - 1) * 0.25),
    Math.floor((days.length - 1) * 0.5),
    Math.floor((days.length - 1) * 0.75),
    days.length - 1,
  ];

  function indexFromEvent(e: ReactPointerEvent<SVGSVGElement>): number | null {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return null;
    const ratio = (e.clientX - rect.left) / rect.width;
    const i = Math.floor(ratio * days.length);
    if (i < 0 || i >= days.length) return null;
    return i;
  }

  const hovered = hoverIndex !== null ? days[hoverIndex] : null;
  const hoveredCenterPct =
    hoverIndex !== null ? ((hoverIndex + 0.5) / days.length) * 100 : 0;
  const hoveredXSvg =
    hoverIndex !== null ? hoverIndex * (barW + GAP) + barW / 2 : 0;
  const anchor =
    hoverIndex !== null
      ? tooltipAnchor(hoverIndex, days.length)
      : { transform: "translate(-50%, -100%)", offsetX: 0 };

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Available, limited, and sold-out cells per day, last ${days.length} days. Maximum ${maxStack} cells.`}
          onPointerMove={(e) => setHoverIndex(indexFromEvent(e))}
          onPointerDown={(e) => setHoverIndex(indexFromEvent(e))}
          onPointerLeave={() => setHoverIndex(null)}
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
            const segments = SUPPLY_SERIES.map((series) => ({
              ...series,
              height: yScale(d[series.key]),
              value: d[series.key],
            }));
            const totalH = segments.reduce(
              (total, segment) => total + segment.height,
              0,
            );
            let stackedH = 0;

            if (totalH === 0) return null;

            return (
              <g key={d.date}>
                <title>{`${formatChartLabel(d.date)}: ${d.available} available, ${d.limited} limited, ${d.soldOut} sold out`}</title>
                {segments.map((segment) => {
                  if (segment.value === 0) return null;

                  stackedH += segment.height;

                  return (
                    <rect
                      key={segment.key}
                      x={x}
                      y={H - stackedH}
                      width={barW}
                      height={segment.height}
                      fill={STOCK[segment.stock].cssVar}
                    />
                  );
                })}
              </g>
            );
          })}
          {statLines.map((line) => (
            <line
              key={line.key}
              x1={0}
              y1={H - yScale(line.value)}
              x2={W}
              y2={H - yScale(line.value)}
              stroke="var(--ink)"
              strokeDasharray={line.dash}
              strokeWidth={line.width}
              vectorEffect="non-scaling-stroke"
              opacity={line.opacity}
              pointerEvents="none"
            >
              <title>{line.label}</title>
            </line>
          ))}
          {hoverIndex !== null ? (
            <line
              x1={hoveredXSvg}
              y1={0}
              x2={hoveredXSvg}
              y2={H}
              stroke="var(--ink-soft)"
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
              opacity={0.55}
              pointerEvents="none"
            />
          ) : null}
        </svg>

        {hovered ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 flex flex-col gap-1 whitespace-nowrap border border-hairline-strong bg-paper-raised px-3 py-2 font-mono text-xs text-ink shadow-sm"
            style={{
              left: `calc(${hoveredCenterPct}% + ${anchor.offsetX}px)`,
              transform: `${anchor.transform} translateY(-8px)`,
            }}
          >
            <span className="tabular-nums text-ink">
              {formatChartLabel(hovered.date)}
            </span>
            {SUPPLY_SERIES.map((row) => (
              <span
                key={row.key}
                className="flex items-baseline gap-2 text-ink-soft"
              >
                <span
                  aria-hidden
                  className="inline-block size-2"
                  style={{ backgroundColor: STOCK[row.stock].cssVar }}
                />
                <span className="tabular-nums text-ink">
                  {hovered[row.key]}
                </span>
                <span>{STOCK[row.stock].label}</span>
                {row.key === "available" ? (
                  <span className="text-ink-faint">
                    {formatAverageDelta(hovered.available, stats.average)}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs tabular-nums text-ink-faint">
        <span className="flex items-center gap-2 text-ink-soft">
          <span
            aria-hidden
            className="inline-block h-px w-5 border-t border-dashed border-ink"
          />
          Available avg {formatSupplyStat(stats.average)}
        </span>
        <span>min {stats.min}</span>
        <span>max {stats.max}</span>
      </div>
      <figcaption className="grid grid-cols-5 text-2xs tabular-nums text-ink-faint">
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
