import {
  getDispatchEvents,
  getLatestPollAt,
} from "@/lib/availability/read-model";
import type { StockEvent } from "@/lib/schema";

export const runtime = "nodejs";
// Feed generation depends on live dispatch history, so keep it out of build-time
// prerendering and let CDN headers handle public caching.
export const revalidate = 60;

const WINDOW_DAYS = 60;
const LIMIT = 200;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hetzner.thegoated.dev";
const FEED_URL = `${SITE_URL}/feed.atom`;
const ARCHIVE_URL = `${SITE_URL}/dispatches`;

const TAG_LABEL: Record<StockEvent["state"], string> = {
  "ongoing-out": "Sold out",
  "resolved-restock": "Restocked",
  "ongoing-rollout": "Rollout",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function eventDate(event: StockEvent): Date {
  const [iso] = event.id.split(":");
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function entry(event: StockEvent): string {
  const date = eventDate(event);
  const iso = date.toISOString();
  const url = `${ARCHIVE_URL}#${encodeURIComponent(event.id)}`;
  const title = `${TAG_LABEL[event.state]} · ${event.title}`;
  const summaryParts = [
    event.body,
    `Scope: ${event.scope}.`,
    `${event.durationLabel}.`,
  ];
  const summary = summaryParts.join(" ");

  return [
    "  <entry>",
    `    <id>${escapeXml(url)}</id>`,
    `    <title>${escapeXml(title)}</title>`,
    `    <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>`,
    `    <published>${iso}</published>`,
    `    <updated>${iso}</updated>`,
    `    <category term="${escapeXml(event.state)}" label="${escapeXml(TAG_LABEL[event.state])}"/>`,
    `    <summary type="text">${escapeXml(summary)}</summary>`,
    "  </entry>",
  ].join("\n");
}

function buildFeed(events: StockEvent[], updated: Date): string {
  const entries = events.map(entry).join("\n");
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    "  <title>Hetzner Cloud Radar</title>",
    "  <subtitle>Independent dispatches on Hetzner Cloud server-type availability.</subtitle>",
    `  <link rel="self" type="application/atom+xml" href="${escapeXml(FEED_URL)}"/>`,
    `  <link rel="alternate" type="text/html" href="${escapeXml(SITE_URL)}"/>`,
    `  <id>${escapeXml(SITE_URL)}/</id>`,
    `  <updated>${updated.toISOString()}</updated>`,
    "  <author>",
    "    <name>Hetzner Cloud Radar</name>",
    "  </author>",
    "  <rights>Independent observation. Not affiliated with Hetzner Online GmbH.</rights>",
    entries,
    "</feed>",
    "",
  ].join("\n");
}

export async function GET() {
  const latestAt = await getLatestPollAt();
  const events = latestAt
    ? await getDispatchEvents(latestAt, LIMIT, WINDOW_DAYS)
    : [];
  const updated =
    events.length > 0 ? eventDate(events[0]) : (latestAt ?? new Date());

  const xml = buildFeed(events, updated);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
