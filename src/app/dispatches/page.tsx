import type { Metadata } from "next";
import {
  formatObservedAt,
  getDispatchEvents,
  getLatestPollAt,
} from "@/lib/availability/read-model";
import { DispatchList } from "../_components/dispatch-list";
import { PageFrame } from "../_components/page-frame";
import { SectionHeader } from "../_components/section-header";

// Keep in sync with POLL_INTERVAL_SECONDS in cadence.ts
export const revalidate = 300;

export const metadata: Metadata = {
  title: "All dispatches",
  description:
    "Full archive of Hetzner Cloud stock-out, restock, and rollout events observed by the radar.",
  alternates: { canonical: "/dispatches" },
};

const WINDOW_DAYS = 60;
const LIMIT = 200;

export default async function DispatchesPage() {
  const latestAt = await getLatestPollAt();
  const events = latestAt
    ? await getDispatchEvents(latestAt, LIMIT, WINDOW_DAYS)
    : [];
  const observedAt = latestAt
    ? formatObservedAt(latestAt)
    : "awaiting first poll";
  const kicker =
    events.length === 0
      ? "Archive"
      : `${events.length} ${events.length === 1 ? "entry" : "entries"} · last ${WINDOW_DAYS} days`;

  return (
    <PageFrame observedAt={observedAt} wide>
      <section className="flex flex-col gap-4 pt-10">
        <SectionHeader
          as="h1"
          kicker={kicker}
          title="All dispatches"
          blurb="Every notable stock-out, restock, and rollout event we have on file. Each row is signed by the timestamp of its first observation. Click a date to share a link to that dispatch."
        />
        <DispatchList events={events} groupByMonth asAnchors />
      </section>
    </PageFrame>
  );
}
