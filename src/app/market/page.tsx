import type { Metadata } from "next";
import Link from "next/link";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import {
  formatPrice,
  listActiveListings,
  sourceLabel,
} from "@/lib/market/listings";
import { DC_META, DCS, type DcCode } from "@/lib/schema";
import { PageFrame } from "../_components/page-frame";
import { SectionHeader } from "../_components/section-header";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Market",
  description:
    "Index of public Hetzner Cloud server transfer posts from Reddit and the Hetzner Forum. Link out to deal.",
  alternates: { canonical: "/market" },
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; dc?: string }>;
}) {
  const { type, dc } = await searchParams;
  const listings = await listActiveListings({
    serverType: type?.toUpperCase(),
    locationCode: dc?.toUpperCase(),
  });

  return (
    <PageFrame observedAt={await getObservedAtLabel()} wide>
      <section className="flex flex-col gap-6 pt-10">
        <SectionHeader
          as="h1"
          kicker="Transfer index"
          title="Cloud server transfers"
          blurb="Public posts about Hetzner Cloud handoffs, pulled from Reddit and the Hetzner Forum Marktplatz. Open the original thread to reply. Not a marketplace host. Not affiliated with Hetzner."
        />

        <form className="flex flex-wrap gap-3 text-sm" method="get">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Type</span>
            <input
              name="type"
              defaultValue={type ?? ""}
              placeholder="CCX33"
              className="w-28 border border-control-border bg-paper-raised px-2 py-1.5 font-mono uppercase"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">Datacentre</span>
            <select
              name="dc"
              defaultValue={dc ?? ""}
              className="border border-control-border bg-paper-raised px-2 py-1.5"
            >
              <option value="">All</option>
              {DCS.map((code) => (
                <option key={code} value={code}>
                  {code} · {DC_META[code].city}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="self-end border border-control-border px-3 py-1.5 hover:border-ink"
          >
            Filter
          </button>
        </form>

        {listings.length === 0 ? (
          <p className="font-sans text-base text-ink-soft">
            No active Cloud transfer posts
            {type || dc
              ? ` for ${[type?.toUpperCase(), dc?.toUpperCase()].filter(Boolean).join(" · ")}`
              : ""}
            . Sources scanned hourly; Forum Marktplatz needs a customer login
            cookie to index.
          </p>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {listings.map((listing) => {
              const loc = listing.locationCode as DcCode | null;
              const city = loc ? (DC_META[loc]?.city ?? loc) : null;
              const meta = [
                listing.serverType,
                city,
                sourceLabel(listing.source),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={listing.id}>
                  <Link
                    href={`/market/${listing.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 hover:bg-paper-recessed"
                  >
                    <span className="font-medium text-ink">
                      <span className="text-sm font-normal text-ink-soft">
                        {meta}
                      </span>
                      <span className="mt-0.5 block">{listing.title}</span>
                    </span>
                    <span className="font-mono tabular-nums text-ink">
                      {listing.priceCents != null
                        ? formatPrice(listing.priceCents, listing.currency)
                        : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="max-w-[68ch] font-sans text-xs leading-relaxed text-ink-faint">
          Deals stay on the source thread. Cloud transfer uses project invites
          and Transfer to project. No payment handling here.
        </p>
      </section>
    </PageFrame>
  );
}
