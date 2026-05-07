import type { Metadata } from "next";
import {
  formatObservedAt,
  getLatestPollAt,
  POLL_CADENCE,
} from "@/lib/availability/read-model";
import { STOCK, type Stock } from "@/lib/schema";
import { SectionHeader } from "../_components/section-header";
import { Masthead } from "../_components/sections/masthead";
import { PageFooter } from "../_components/sections/page-footer";
import { StockGlyph } from "../_components/stock-glyph";

export const runtime = "nodejs";
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Methodology · Hetzner Cloud Radar",
  description:
    "How Hetzner Cloud Radar observes Hetzner Cloud server-type availability per region.",
};

type StateRow = {
  state: Stock;
  meaning: string;
  api: string;
};

const STATE_ROWS: StateRow[] = [
  {
    state: "available",
    meaning:
      "The server type can be created in this region right now, and has stayed steady all day.",
    api: "Listed in datacentre.server_types.available, no flicker today.",
  },
  {
    state: "limited",
    meaning:
      "The server type has flickered between available and sold out at least once today. Currently up or down doesn't matter; the signal is instability.",
    api: "Derived from poll history. The day boundary resets at 00:00 UTC.",
  },
  {
    state: "sold-out",
    meaning:
      "The server type cannot be created in this region right now. Existing servers are unaffected.",
    api: "Listed in datacentre.server_types.supported but absent from .available.",
  },
  {
    state: "not-offered",
    meaning:
      "The server type is not sold in this region at all. Distinct from sold out.",
    api: "Absent from datacentre.server_types.supported.",
  },
];

export default async function MethodologyPage() {
  const latestAt = await getLatestPollAt();
  const observedAt = latestAt
    ? formatObservedAt(latestAt)
    : "awaiting first poll";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-10 pb-20 sm:px-10 sm:pt-16">
      <Masthead observedAt={observedAt} />

      <section className="flex flex-col gap-5 pt-10">
        <SectionHeader
          kicker="How the radar works"
          title="Methodology"
          blurb="Hetzner Cloud Radar is an independent observer. It polls the public Hetzner Cloud API on a fixed cadence, normalises the response into four states, and publishes the result. Nothing is inferred where data is missing; nothing is hidden where it is."
        />

        <div className="flex flex-col gap-3 pt-2">
          <h3 className="text-lg font-medium tracking-tight text-ink">
            What we poll
          </h3>
          <p className="max-w-[68ch] font-sans text-base leading-[1.7] text-ink-soft">
            Every {POLL_CADENCE}, the radar requests{" "}
            <a
              href="https://docs.hetzner.cloud/reference/cloud#tag/datacenters"
              className="font-mono text-ink underline-offset-4 hover:text-accent hover:underline"
            >
              GET /v1/datacenters
            </a>{" "}
            from the public Hetzner Cloud API. The endpoint returns each
            datacentre with three lists per server type:{" "}
            <span className="font-mono text-ink">supported</span>,{" "}
            <span className="font-mono text-ink">available</span>, and{" "}
            <span className="font-mono text-ink">available_for_migration</span>.
            The radar only uses the first two.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <h3 className="text-lg font-medium tracking-tight text-ink">
            The four cell states
          </h3>
          <p className="max-w-[68ch] font-sans text-base leading-[1.7] text-ink-soft">
            Each cell on the matrix collapses the API response into one of four
            states. The Hetzner API itself only exposes binary purchase
            availability, so &ldquo;limited&rdquo; is derived from poll history.
          </p>

          <dl className="flex flex-col">
            {STATE_ROWS.map((row, i) => (
              <div
                key={row.state}
                className={`grid grid-cols-1 gap-3 py-5 sm:grid-cols-[140px_1fr] sm:gap-8 ${
                  i > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <dt className="flex items-baseline gap-2 text-sm">
                  <StockGlyph stock={row.state} />
                  <span
                    className={`font-medium uppercase tracking-[0.08em] ${STOCK[row.state].textClass}`}
                  >
                    {STOCK[row.state].label}
                  </span>
                </dt>
                <dd className="flex flex-col gap-1.5">
                  <p className="max-w-[68ch] font-sans text-base leading-[1.6] text-ink">
                    {row.meaning}
                  </p>
                  <p className="font-mono text-xs text-ink-faint">{row.api}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <h3 className="text-lg font-medium tracking-tight text-ink">
            Cadence and freshness
          </h3>
          <p className="max-w-[68ch] font-sans text-base leading-[1.7] text-ink-soft">
            Polls run every {POLL_CADENCE} from a single observation point. A
            poll is considered successful only when the API responds with a full
            datacentre list and no rate-limit errors. Failed polls are recorded
            but never used to decide cell state, so a transient outage on the
            radar side never reads as a stock-out on yours.
          </p>
          <p className="max-w-[68ch] font-sans text-base leading-[1.7] text-ink-soft">
            The masthead timestamp on every page is the time of the most recent
            successful poll. If you ever see it stale by more than a few
            minutes, the radar is the one having a bad day.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <h3 className="text-lg font-medium tracking-tight text-ink">
            What counts as a dispatch
          </h3>
          <p className="max-w-[68ch] font-sans text-base leading-[1.7] text-ink-soft">
            A dispatch is filed when a cell transitions in a way that matters:
          </p>
          <ul className="flex flex-col gap-1.5 pl-5 max-w-[68ch] font-sans text-base leading-[1.65] text-ink-soft list-disc marker:text-ink-faint">
            <li>
              <span className="text-ink">Sold out:</span> a previously available
              cell becomes unavailable, and is still unavailable at publication
              time.
            </li>
            <li>
              <span className="text-ink">Restocked:</span> a previously sold-out
              cell becomes available again.
            </li>
            <li>
              <span className="text-ink">Rollout:</span> a previously
              not-offered cell becomes available, indicating new regional
              capacity.
            </li>
          </ul>
          <p className="max-w-[68ch] font-sans text-base leading-[1.7] text-ink-soft">
            Brief flickers within a single day raise a cell to{" "}
            <span className="font-mono text-ink">limited</span> on the matrix
            but do not generate a separate dispatch.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <h3 className="text-lg font-medium tracking-tight text-ink">
            Independence
          </h3>
          <p className="max-w-[68ch] font-sans text-base leading-[1.7] text-ink-soft">
            Hetzner Cloud Radar is not affiliated with Hetzner Online GmbH. The
            radar reads only the public API. It does not represent Hetzner, does
            not speak on their behalf, and does not coordinate on incident
            communication. When the radar disagrees with an official statement,
            the radar reports what it observed and lets the reader decide.
          </p>
        </div>
      </section>

      <PageFooter pollCadence={POLL_CADENCE} />
    </div>
  );
}
