import { POLL_CADENCE } from "@/lib/availability/cadence";
import type { AvailabilityReadModel } from "@/lib/availability/read-model";
import {
  DCS,
  type Family,
  STOCK,
  type Stock,
  type StockEvent,
} from "@/lib/schema";

const HOME_TITLE = "Hetzner Cloud availability · live stock by datacentre";
const HOME_DESCRIPTION =
  "Independent Hetzner Cloud server availability tracker. Live stock by datacentre for CX, CAX, CPX, and CCX, with stock-out history and email dispatches.";

const TAG_LABEL: Record<StockEvent["state"], string> = {
  "ongoing-out": "Sold out",
  "resolved-restock": "Restocked",
  "ongoing-rollout": "Rollout",
};

function frontmatter(fields: Record<string, string>) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

function stockLabel(stock: Stock) {
  return STOCK[stock].label;
}

function tally(allCells: Stock[]) {
  return {
    tracked: allCells.length,
    available: allCells.filter((s) => s === "available").length,
    limited: allCells.filter((s) => s === "limited").length,
    soldOut: allCells.filter((s) => s === "sold-out").length,
    notOffered: allCells.filter((s) => s === "not-offered").length,
  };
}

function familyTable(family: Family) {
  const header = `| Type | Cores | RAM | Disk | ${DCS.join(" | ")} |`;
  const sep = `| --- | ---: | ---: | ---: | ${DCS.map(() => "---").join(" | ")} |`;
  const rows = family.types.map((t) => {
    const cells = DCS.map((dc) => stockLabel(t.stock[dc])).join(" | ");
    return `| ${t.code} | ${t.cores} | ${t.ram} GB | ${t.disk} GB | ${cells} |`;
  });
  return [
    `## ${family.label}`,
    "",
    family.blurb,
    "",
    header,
    sep,
    ...rows,
    "",
  ].join("\n");
}

function eventsList(events: StockEvent[], empty: string) {
  if (events.length === 0) return empty;
  return events
    .map(
      (e) =>
        `- **${TAG_LABEL[e.state]}** · ${e.title}: ${e.body} (${e.scope}; ${e.durationLabel})`,
    )
    .join("\n");
}

export function renderHomeMd(data: AvailabilityReadModel) {
  const allCells = data.families.flatMap((f) =>
    f.types.flatMap((t) => DCS.map((dc) => t.stock[dc])),
  );
  const totals = tally(allCells);

  return [
    frontmatter({ title: HOME_TITLE, description: HOME_DESCRIPTION }),
    `# Hetzner Cloud Radar`,
    "",
    `Observed: ${data.observedAt} · poll every ${data.pollCadence}`,
    "",
    `## Right now`,
    "",
    data.topLine.line,
    "",
    `- Tracked cells: ${totals.tracked}`,
    `- Available: ${totals.available}`,
    `- Limited: ${totals.limited}`,
    `- Sold out: ${totals.soldOut}`,
    `- Not offered: ${totals.notOffered}`,
    "",
    ...data.families.map(familyTable),
    `## Recent dispatches`,
    "",
    eventsList(
      data.events,
      "The wire has been quiet. No dispatches filed in the last thirty days.",
    ),
    "",
    `## Subscribe`,
    "",
    "Email dispatches when a server type goes sold out or returns to stock: use the HTML site subscribe form.",
    "",
    `## Links`,
    "",
    `- [Methodology](/methodology)`,
    `- [All dispatches](/dispatches)`,
    `- [Atom feed](/feed.atom)`,
    "",
  ].join("\n");
}

const STATE_ROWS = [
  {
    state: "available" as const,
    meaning:
      "The server type can be created in this region right now, and has stayed steady all day.",
    api: "Listed in datacentre.server_types.available, no flicker today.",
  },
  {
    state: "limited" as const,
    meaning:
      "The server type has flickered between available and sold out at least once today. Currently up or down doesn't matter; the signal is instability.",
    api: "Derived from poll history. The day boundary resets at 00:00 UTC.",
  },
  {
    state: "sold-out" as const,
    meaning:
      "The server type cannot be created in this region right now. Existing servers are unaffected.",
    api: "Listed in datacentre.server_types.supported but absent from .available.",
  },
  {
    state: "not-offered" as const,
    meaning:
      "The server type is not sold in this region at all. Distinct from sold out.",
    api: "Absent from datacentre.server_types.supported.",
  },
];

export function renderMethodologyMd(observedAt: string) {
  return [
    frontmatter({
      title: "Methodology · Hetzner Cloud Radar",
      description:
        "How Hetzner Cloud Radar observes Hetzner Cloud server-type availability per region.",
    }),
    `# Methodology`,
    "",
    `Observed: ${observedAt}`,
    "",
    "Hetzner Cloud Radar is an independent observer. It polls the public Hetzner Cloud API on a fixed cadence, normalises the response into four states, and publishes the result. Nothing is inferred where data is missing; nothing is hidden where it is.",
    "",
    `## What we poll`,
    "",
    `Every ${POLL_CADENCE}, the radar requests GET /v1/datacenters from the public Hetzner Cloud API. The endpoint returns each datacentre with three lists per server type: supported, available, and available_for_migration. The radar only uses the first two.`,
    "",
    `## The four cell states`,
    "",
    "Each cell on the matrix collapses the API response into one of four states. The Hetzner API itself only exposes binary purchase availability, so “limited” is derived from poll history.",
    "",
    ...STATE_ROWS.flatMap((row) => [
      `### ${STOCK[row.state].label}`,
      "",
      row.meaning,
      "",
      `\`${row.api}\``,
      "",
    ]),
    `## Cadence and freshness`,
    "",
    `Polls run every ${POLL_CADENCE} from a single observation point. A poll is considered successful only when the API responds with a full datacentre list and no rate-limit errors. Failed polls are recorded but never used to decide cell state, so a transient outage on the radar side never reads as a stock-out on yours.`,
    "",
    "The masthead timestamp on every page is the time of the most recent successful poll. If you ever see it stale by more than a few minutes, the radar is the one having a bad day.",
    "",
    `## What counts as a dispatch`,
    "",
    "A dispatch is filed when a cell transitions in a way that matters:",
    "",
    "- **Sold out:** a previously available cell becomes unavailable, and is still unavailable at publication time.",
    "- **Restocked:** a previously sold-out cell becomes available again.",
    "- **Rollout:** a previously not-offered cell becomes available, indicating new regional capacity.",
    "",
    "Brief flickers within a single day raise a cell to `limited` on the matrix but do not generate a separate dispatch.",
    "",
    `## Independence`,
    "",
    "Hetzner Cloud Radar is not affiliated with Hetzner Online GmbH. The radar reads only the public API. It does not represent Hetzner, does not speak on their behalf, and does not coordinate on incident communication. When the radar disagrees with an official statement, the radar reports what it observed and lets the reader decide.",
    "",
  ].join("\n");
}

export function renderDispatchesMd(
  events: StockEvent[],
  observedAt: string,
  windowDays: number,
) {
  const kicker =
    events.length === 0
      ? "Archive"
      : `${events.length} ${events.length === 1 ? "entry" : "entries"} · last ${windowDays} days`;

  return [
    frontmatter({
      title: "All dispatches · Hetzner Cloud Radar",
      description:
        "Full archive of Hetzner Cloud stock-out, restock, and rollout events observed by the radar.",
    }),
    `# All dispatches`,
    "",
    `${kicker} · Observed: ${observedAt}`,
    "",
    "Every notable stock-out, restock, and rollout event on file. Each row is signed by the timestamp of its first observation.",
    "",
    eventsList(events, "No dispatches on file for this window."),
    "",
    `## Links`,
    "",
    `- [Home](/)`,
    `- [Atom feed](/feed.atom)`,
    "",
  ].join("\n");
}
