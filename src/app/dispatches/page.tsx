import type { Metadata } from "next";
import {
  formatObservedAt,
  getDispatchEvents,
  getLatestPollAt,
  POLL_CADENCE,
} from "@/lib/availability/read-model";
import { DispatchList } from "../_components/dispatch-list";
import { SectionHeader } from "../_components/section-header";
import { Masthead } from "../_components/sections/masthead";
import { PageFooter } from "../_components/sections/page-footer";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata: Metadata = {
  title: "All dispatches · Hetzner Cloud Radar",
  description:
    "Full archive of Hetzner Cloud stock-out, restock, and rollout events observed by the radar.",
};

const WINDOW_DAYS = 365;
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-10 pb-20 sm:px-10 sm:pt-16">
      <Masthead observedAt={observedAt} />

      <section className="flex flex-col gap-4 pt-10">
        <SectionHeader
          kicker={kicker}
          title="All dispatches"
          blurb="Every notable stock-out, restock, and rollout event we have on file. Each row is signed by the timestamp of its first observation. Click a date to share a link to that dispatch."
        />
        <DispatchList events={events} groupByMonth asAnchors />
      </section>

      <PageFooter pollCadence={POLL_CADENCE} />
    </div>
  );
}
