import type { StockEvent } from "@/lib/schema";
import { SectionHeader } from "../section-header";
import { StockTag } from "../stock-tag";

const TAG_FOR: Record<
  StockEvent["state"],
  { stock: Parameters<typeof StockTag>[0]["stock"]; label: string }
> = {
  "ongoing-out": { stock: "sold-out", label: "Ongoing · Sold out" },
  "resolved-restock": { stock: "available", label: "Resolved · Restocked" },
  "ongoing-rollout": { stock: "limited", label: "Ongoing · Rollout" },
};

export function Dispatches({ events }: { events: StockEvent[] }) {
  return (
    <section className="flex flex-col gap-4 pt-14">
      <SectionHeader
        kicker="Last 30 days"
        title="Recent dispatches"
        blurb="Notable stock-out, restock, and rollout events. Each dispatch is signed by the timestamp of its first observation."
      />
      {events.length === 0 ? (
        <p className="font-sans text-sm leading-[1.6] text-ink-soft">
          The wire has been quiet. No dispatches filed in the last thirty days.
        </p>
      ) : (
        <ol className="flex flex-col">
          {events.map((e, i) => {
            const tag = TAG_FOR[e.state];
            return (
              <li
                key={e.id}
                className={`grid grid-cols-1 gap-3 py-6 sm:grid-cols-[200px_1fr] sm:gap-8 ${
                  i > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <div className="flex flex-col gap-1 text-xs">
                  <span className="tabular-nums text-ink">{e.startedAt}</span>
                  <span className="tabular-nums text-ink-faint">
                    {e.durationLabel}
                  </span>
                  <span className="text-ink-soft">{e.scope}</span>
                  <span className="mt-2">
                    <StockTag stock={tag.stock} label={tag.label} />
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-medium tracking-tight text-ink">
                    {e.title}
                  </h3>
                  <p className="max-w-[68ch] font-sans text-sm leading-[1.6] text-ink-soft">
                    {e.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
