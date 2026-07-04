import type { StockEvent } from "@/lib/schema";
import { DispatchList } from "../dispatch-list";
import { SectionHeader } from "../section-header";

export function Dispatches({ events }: { events: StockEvent[] }) {
  return (
    <section className="flex flex-col gap-4 pt-14">
      <SectionHeader
        kicker="Last 30 days"
        title="Recent dispatches"
        blurb="Notable stock-out, restock, and rollout events. Each dispatch is signed by the timestamp of its first observation."
      />
      <DispatchList
        events={events}
        emptyMessage="The wire has been quiet. No dispatches filed in the last thirty days."
      />
    </section>
  );
}
