"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AvailabilityHistory } from "@/lib/availability/history";
import { DC_META, type DcCode, STOCK, type Stock } from "@/lib/schema";

const HOVER_INTENT_MS = 150;
const STATE_ORDER: Stock[] = [
  "available",
  "limited",
  "sold-out",
  "unknown",
  "not-offered",
];

type Props = {
  type: string;
  dc: DcCode;
  currentStock: Stock;
  children: (props: {
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    triggerProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
    ariaDescribedBy?: string;
  }) => React.ReactNode;
};

async function fetchHistory(
  type: string,
  dc: DcCode,
): Promise<AvailabilityHistory> {
  const response = await fetch(
    `/api/availability/history?type=${encodeURIComponent(type)}&dc=${encodeURIComponent(dc)}`,
  );
  if (!response.ok) {
    throw new Error(`History request failed: HTTP ${response.status}`);
  }
  return (await response.json()) as AvailabilityHistory;
}

export function AvailabilityHistoryPopover({
  type,
  dc,
  currentStock,
  children,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const openTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const popoverId = useId();

  const clearTimers = useCallback(() => {
    if (openTimeoutRef.current !== null) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimers();
    openTimeoutRef.current = window.setTimeout(() => {
      setShouldFetch(true);
      setOpen(true);
    }, HOVER_INTENT_MS);
  }, [clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 120);
  }, [clearTimers]);

  const openNow = useCallback(() => {
    clearTimers();
    setShouldFetch(true);
    setOpen(true);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const rect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportPad = 8;
    const preferredLeft = rect.left + rect.width / 2 - popoverRect.width / 2;
    const clampedLeft = Math.max(
      viewportPad,
      Math.min(
        preferredLeft,
        window.innerWidth - popoverRect.width - viewportPad,
      ),
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > popoverRect.height + 12;
    const top = placeBelow
      ? rect.bottom + 8 + window.scrollY
      : rect.top - popoverRect.height - 8 + window.scrollY;

    setPosition({ top, left: clampedLeft + window.scrollX });
  }, [open]);

  const query = useQuery({
    queryKey: ["availability-history", type, dc],
    queryFn: () => fetchHistory(type, dc),
    enabled: shouldFetch,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const triggerProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
    type: "button",
    onMouseEnter: scheduleOpen,
    onMouseLeave: scheduleClose,
    onFocus: openNow,
    onBlur: scheduleClose,
    onClick: (event) => {
      event.preventDefault();
      if (open) {
        setOpen(false);
      } else {
        openNow();
      }
    },
    "aria-expanded": open,
    "aria-haspopup": "dialog",
    "aria-describedby": open ? popoverId : undefined,
  };

  return (
    <>
      {children({
        triggerRef,
        triggerProps,
        ariaDescribedBy: open ? popoverId : undefined,
      })}
      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={`14-day availability history for ${type} in ${dc}`}
          onMouseEnter={clearTimers}
          onMouseLeave={scheduleClose}
          style={{
            position: "absolute",
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            visibility: position ? "visible" : "hidden",
          }}
          className="z-50 w-[min(360px,calc(100vw-16px))] border border-hairline-strong bg-paper-raised p-3 shadow-lg"
        >
          <PopoverBody
            type={type}
            dc={dc}
            currentStock={currentStock}
            history={query.data}
            isLoading={query.isLoading}
            isError={query.isError}
          />
        </div>
      )}
    </>
  );
}

function PopoverBody({
  type,
  dc,
  currentStock,
  history,
  isLoading,
  isError,
}: {
  type: string;
  dc: DcCode;
  currentStock: Stock;
  history: AvailabilityHistory | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
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
          className={`text-sm leading-none ${STOCK[currentStock].textClass}`}
        >
          {STOCK[currentStock].glyph}
        </span>
      </header>

      {isLoading && (
        <p className="text-2xs text-ink-faint">Loading 14-day history…</p>
      )}
      {isError && <p className="text-2xs text-down">Could not load history.</p>}
      {history && <HistoryStrip history={history} />}
      {history && (
        <p className="text-2xs text-ink-soft leading-relaxed">
          {summaryLine(history)}
        </p>
      )}
    </div>
  );
}

function HistoryStrip({ history }: { history: AvailabilityHistory }) {
  const windowStart = new Date(history.windowStart).getTime();
  const windowEnd = new Date(history.windowEnd).getTime();
  const totalSpan = Math.max(1, windowEnd - windowStart);

  return (
    <div className="flex flex-col gap-1">
      <div
        aria-hidden
        className="flex h-6 w-full overflow-hidden border border-hairline"
      >
        {history.runs.map((run) => {
          const from = new Date(run.from).getTime();
          const to = new Date(run.to).getTime();
          const widthPct = ((to - from) / totalSpan) * 100;
          if (widthPct <= 0) return null;
          return (
            <span
              key={`${run.from}-${run.state}`}
              style={{
                width: `${widthPct}%`,
                background: STOCK[run.state].cssVar,
              }}
              title={`${STOCK[run.state].label} · ${formatTimeRange(run.from, run.to)}`}
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
    </div>
  );
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

function formatTimeRange(fromIso: string, toIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    });
  return `${fmt(fromIso)} → ${fmt(toIso)} UTC`;
}
