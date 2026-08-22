"use client";

import {
  type CSSProperties,
  type ToggleEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { AvailabilityHistory } from "@/lib/availability/history";
import { useDispatchPrefStore } from "@/lib/marketing/dispatch-pref-store";
import { DISPATCH_SERVER_FAMILIES } from "@/lib/marketing/preferences";
import {
  DC_META,
  type DcCode,
  type FamilyId,
  STOCK,
  type Stock,
} from "@/lib/schema";
import { SERVER_FAMILY_META } from "@/lib/server-families";

const STATE_ORDER: Stock[] = [
  "available",
  "limited",
  "sold-out",
  "unknown",
  "not-offered",
];

const HOVER_OPEN_MS = 150;
const HOVER_CLOSE_MS = 100;

function canHover(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
  );
}

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

function toggleValue<T extends string>(
  values: readonly T[],
  value: T,
  checked: boolean,
): T[] {
  return checked
    ? [...new Set([...values, value])]
    : values.filter((item) => item !== value);
}

export function StockCell({
  stock,
  dc,
  type,
  familyId,
}: {
  stock: Stock;
  dc: DcCode;
  type: string;
  familyId: FamilyId;
}) {
  const popoverId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [history, setHistory] = useState<AvailabilityHistory | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [open, setOpen] = useState(false);
  const dispatchFamily = DISPATCH_SERVER_FAMILIES.includes(familyId);
  const familyOn = useDispatchPrefStore((s) => s.families.includes(familyId));
  const dcOn = useDispatchPrefStore((s) => s.datacentres.includes(dc));
  const locked = useDispatchPrefStore((s) => s.locked);
  const setFamilies = useDispatchPrefStore((s) => s.setFamilies);
  const setDatacentres = useDispatchPrefStore((s) => s.setDatacentres);
  const familyLabel =
    SERVER_FAMILY_META[familyId]?.label ?? familyId.toUpperCase();
  const srLabel = `${type} in ${dc}, ${DC_META[dc].city}: ${STOCK[stock].label}`;

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

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

  function clearTimers() {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }

  function scheduleOpen() {
    if (!canHover()) return;
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (openTimer.current || panelRef.current?.matches(":popover-open")) return;
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      panelRef.current?.showPopover();
    }, HOVER_OPEN_MS);
  }

  function scheduleClose() {
    if (!canHover()) return;
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      panelRef.current?.hidePopover();
    }, HOVER_CLOSE_MS);
  }

  async function onToggle(event: ToggleEvent<HTMLDivElement>) {
    const isOpen = event.newState === "open";
    setOpen(isOpen);
    if (!isOpen) {
      clearTimers();
      return;
    }
    if (history || status === "loading") return;
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
        aria-expanded={open}
        aria-controls={popoverId}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        className="inline-flex size-6 cursor-pointer items-center justify-center bg-transparent p-0 leading-none opacity-90 hover:opacity-100"
        style={{ anchorName: `--s-${type}-${dc}` } as CSSProperties}
      >
        <span className="sr-only">
          {srLabel}. Activate for 24-hour availability history.
        </span>
        <span
          aria-hidden
          className={`inline-block text-sm leading-none ${STOCK[stock].textClass}`}
        >
          {STOCK[stock].glyph}
        </span>
      </button>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover bridge keeps popover open while cursor moves onto panel */}
      <div
        ref={panelRef}
        id={popoverId}
        popover="auto"
        onToggle={onToggle}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        className="z-50 m-0 w-[min(360px,calc(100vw-16px))] overflow-y-auto border border-hairline-strong bg-paper-raised p-3 shadow-lg overscroll-contain"
        style={
          {
            positionAnchor: `--s-${type}-${dc}`,
            top: "anchor(bottom)",
            left: "anchor(center)",
            translate: "-50% 8px",
          } as CSSProperties
        }
      >
        <div className="flex flex-col gap-2" aria-live="polite">
          <header className="flex min-w-0 items-baseline justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              <span
                className="font-medium text-ink text-sm tracking-[0.04em]"
                translate="no"
              >
                {type}
              </span>
              <span className="text-2xs text-ink-faint uppercase tracking-[0.1em]">
                {dc} · {DC_META[dc].city}
              </span>
            </div>
            <span
              aria-hidden
              className={`shrink-0 text-sm leading-none ${STOCK[stock].textClass}`}
            >
              {STOCK[stock].glyph}
            </span>
          </header>
          {status === "loading" && (
            <p className="text-2xs text-ink-faint">Loading 24-hour history…</p>
          )}
          {status === "error" && (
            <p className="text-2xs text-down">
              Could not load history. Close and try again.
            </p>
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
                <span>24h ago</span>
                <span>now</span>
              </div>
              <p className="break-words text-2xs text-ink-soft leading-relaxed">
                {summaryLine(history)}
              </p>
            </>
          )}
          {dispatchFamily ? (
            <fieldset
              disabled={locked}
              className="flex flex-col gap-1.5 border-t border-hairline pt-2"
            >
              <legend className="float-left mb-1 w-full p-0 text-2xs uppercase tracking-[0.1em] text-ink-faint">
                Mail alerts (subscribe form)
              </legend>
              <p className="text-2xs text-ink-faint leading-relaxed">
                Whole {familyLabel} line @ selected DCs — not {type} alone.
              </p>
              <div className="flex items-center justify-between gap-4 px-6">
                <div className="flex min-w-0 items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-2xs text-ink hover:text-ink">
                    <input
                      type="checkbox"
                      checked={familyOn}
                      disabled={locked}
                      onChange={(e) => {
                        const { families } = useDispatchPrefStore.getState();
                        setFamilies(
                          toggleValue(families, familyId, e.target.checked),
                        );
                      }}
                      className="size-3.5 shrink-0 accent-accent"
                    />
                    <span className="font-mono">{familyLabel} family</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-2xs text-ink hover:text-ink">
                    <input
                      type="checkbox"
                      checked={dcOn}
                      disabled={locked}
                      onChange={(e) => {
                        const { datacentres } = useDispatchPrefStore.getState();
                        setDatacentres(
                          toggleValue(datacentres, dc, e.target.checked),
                        );
                      }}
                      className="size-3.5 shrink-0 accent-accent"
                    />
                    <span className="font-mono">{dc}</span>
                  </label>
                </div>
                {locked ? null : (
                  <button
                    type="button"
                    onClick={() => {
                      panelRef.current?.hidePopover();
                      document.getElementById("subscribe")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    className="min-h-7 shrink-0 cursor-pointer rounded-edge border border-hairline-strong px-3 font-mono text-2xs uppercase tracking-[0.1em] text-ink hover:border-accent hover:text-accent"
                  >
                    Subscribe
                  </button>
                )}
              </div>
            </fieldset>
          ) : null}
        </div>
      </div>
    </td>
  );
}
