"use client";

import { type CSSProperties, type ToggleEvent, useId, useState } from "react";
import type { AvailabilityHistory } from "@/lib/availability/history";
import { DC_META, type DcCode, STOCK, type Stock } from "@/lib/schema";

const STATE_ORDER: Stock[] = [
  "available",
  "limited",
  "sold-out",
  "unknown",
  "not-offered",
];

function formatDuration(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  const days = Math.floor(sec / 86_400);
  const hours = Math.floor((sec % 86_400) / 3_600);
  const minutes = Math.floor((sec % 3_600) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${sec}s`;
}

function summaryLine(history: AvailabilityHistory): string {
  const parts: string[] = [];
  for (const state of STATE_ORDER) {
    const seconds = history.totals[state];
    if (seconds <= 0) continue;
    parts.push(
      `${formatDuration(seconds)} ${STOCK[state].label.toLowerCase()}`,
    );
  }
  if (history.lastChangeAt) {
    const ago = Math.max(
      0,
      (Date.now() - new Date(history.lastChangeAt).getTime()) / 1000,
    );
    parts.push(`last change ${formatDuration(ago)} ago`);
  } else {
    parts.push("no changes in window");
  }
  return parts.join(" · ");
}

export function StockCell({
  stock,
  dc,
  type,
}: {
  stock: Stock;
  dc: DcCode;
  type: string;
}) {
  const popoverId = useId();
  const [history, setHistory] = useState<AvailabilityHistory | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const srLabel = `${type} in ${dc}, ${DC_META[dc].city}: ${STOCK[stock].label}`;

  if (stock === "not-offered") {
    return (
      <td className="px-0 py-3 text-center align-top sm:px-2">
        <span className="sr-only">{srLabel}</span>
        <span
          aria-hidden
          className={`inline-block text-base leading-none ${STOCK[stock].textClass}`}
        >
          {STOCK[stock].glyph}
        </span>
      </td>
    );
  }

  async function onToggle(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || history || status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch(
        `/api/availability/history?type=${encodeURIComponent(type)}&dc=${encodeURIComponent(dc)}`,
      );
      if (!response.ok) throw new Error();
      setHistory((await response.json()) as AvailabilityHistory);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <td className="px-0 py-3 text-center align-top sm:px-2">
      <button
        type="button"
        popoverTarget={popoverId}
        className="inline-flex cursor-pointer items-center justify-center bg-transparent p-0 leading-none"
        style={{ anchorName: `--s-${type}-${dc}` } as CSSProperties}
      >
        <span className="sr-only">
          {srLabel}. Activate for 14-day availability history.
        </span>
        <span
          aria-hidden
          className={`inline-block text-sm leading-none ${STOCK[stock].textClass}`}
        >
          {STOCK[stock].glyph}
        </span>
      </button>
      <div
        id={popoverId}
        popover="auto"
        onToggle={onToggle}
        className="z-50 m-0 w-[min(360px,calc(100vw-16px))] border border-hairline-strong bg-paper-raised p-3 shadow-lg"
        style={
          {
            positionAnchor: `--s-${type}-${dc}`,
            top: "anchor(bottom)",
            left: "anchor(center)",
            translate: "-50% 8px",
          } as CSSProperties
        }
      >
        <div className="flex flex-col gap-2">
          <header className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-ink text-sm tracking-[0.04em]">
                {type}
              </span>
              <span className="text-2xs text-ink-faint uppercase tracking-[0.1em]">
                {dc} · {DC_META[dc].city}
              </span>
            </div>
            <span
              aria-hidden
              className={`text-sm leading-none ${STOCK[stock].textClass}`}
            >
              {STOCK[stock].glyph}
            </span>
          </header>
          {status === "loading" && (
            <p className="text-2xs text-ink-faint">Loading 14-day history…</p>
          )}
          {status === "error" && (
            <p className="text-2xs text-down">Could not load history.</p>
          )}
          {history && (
            <>
              <div
                aria-hidden
                className="flex h-6 w-full overflow-hidden border border-hairline"
              >
                {history.runs.map((run) => {
                  const span =
                    new Date(history.windowEnd).getTime() -
                    new Date(history.windowStart).getTime();
                  const widthPct =
                    ((new Date(run.to).getTime() -
                      new Date(run.from).getTime()) /
                      Math.max(1, span)) *
                    100;
                  if (widthPct <= 0) return null;
                  return (
                    <span
                      key={`${run.from}-${run.state}`}
                      style={{
                        width: `${widthPct}%`,
                        background: STOCK[run.state].cssVar,
                      }}
                    />
                  );
                })}
              </div>
              <div
                aria-hidden
                className="flex justify-between text-2xs text-ink-faint tracking-[0.08em]"
              >
                <span>14d ago</span>
                <span>now</span>
              </div>
              <p className="text-2xs text-ink-soft leading-relaxed">
                {summaryLine(history)}
              </p>
            </>
          )}
        </div>
      </div>
    </td>
  );
}
