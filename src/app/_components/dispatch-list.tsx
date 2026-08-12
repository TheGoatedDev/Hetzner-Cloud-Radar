import { STOCK, type Stock, type StockEvent } from "@/lib/schema";

const TAG_FOR: Record<StockEvent["state"], { stock: Stock; label: string }> = {
  "ongoing-out": { stock: "sold-out", label: "Ongoing · Sold out" },
  "resolved-restock": { stock: "available", label: "Resolved · Restocked" },
  "ongoing-rollout": { stock: "limited", label: "Ongoing · Rollout" },
};

function DispatchRow({
  event,
  topBorder,
  asAnchor = false,
}: {
  event: StockEvent;
  topBorder: boolean;
  asAnchor?: boolean;
}) {
  const tag = TAG_FOR[event.state];
  return (
    <li
      id={asAnchor ? event.id : undefined}
      className={`grid grid-cols-1 gap-3 py-6 sm:grid-cols-[200px_1fr] sm:gap-8 ${
        topBorder ? "border-t border-hairline" : ""
      }`}
    >
      <div className="flex flex-col gap-1 text-xs">
        <span className="tabular-nums text-ink">{event.startedAt}</span>
        <span className="tabular-nums text-ink-faint">
          {event.durationLabel}
        </span>
        <span className="text-ink-soft">{event.scope}</span>
        <span
          className={`mt-2 inline-flex items-baseline gap-2 text-xs font-medium uppercase tracking-[0.1em] ${STOCK[tag.stock].textClass}`}
        >
          <span aria-hidden className="inline-block leading-none">
            {STOCK[tag.stock].glyph}
          </span>
          <span>{tag.label}</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium tracking-tight text-ink">
          {event.title}
        </h3>
        <p className="max-w-[68ch] font-sans text-sm leading-[1.6] text-ink-soft">
          {event.body}
        </p>
      </div>
    </li>
  );
}

function parseDispatchDate(event: StockEvent): Date | null {
  const [iso] = event.id.split(":");
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DispatchList({
  events,
  groupByMonth = false,
  emptyMessage = "The wire has been quiet. No dispatches filed.",
  asAnchors = false,
}: {
  events: StockEvent[];
  groupByMonth?: boolean;
  emptyMessage?: string;
  asAnchors?: boolean;
}) {
  if (events.length === 0) {
    return (
      <p className="font-sans text-sm leading-[1.6] text-ink-soft">
        {emptyMessage}
      </p>
    );
  }

  if (!groupByMonth) {
    return (
      <ol className="flex flex-col">
        {events.map((event, i) => (
          <DispatchRow
            key={event.id}
            event={event}
            topBorder={i > 0}
            asAnchor={asAnchors}
          />
        ))}
      </ol>
    );
  }

  const groups = new Map<string, StockEvent[]>();
  for (const event of events) {
    const date = parseDispatchDate(event);
    const key = date ? monthKey(date) : "unknown";
    const bucket = groups.get(key) ?? [];
    bucket.push(event);
    groups.set(key, bucket);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );

  return (
    <div className="flex flex-col gap-2">
      {sortedKeys.map((key, groupIndex) => {
        const monthEvents = groups.get(key) ?? [];
        return (
          <section
            key={key}
            className={`flex flex-col gap-2 ${groupIndex > 0 ? "pt-8" : ""}`}
          >
            <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
              {monthLabel(key)}
              <span className="ml-3 normal-case tracking-normal">
                {monthEvents.length} dispatch
                {monthEvents.length === 1 ? "" : "es"}
              </span>
            </h3>
            <ol className="flex flex-col">
              {monthEvents.map((event, i) => (
                <DispatchRow
                  key={event.id}
                  event={event}
                  topBorder={i > 0}
                  asAnchor={asAnchors}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
