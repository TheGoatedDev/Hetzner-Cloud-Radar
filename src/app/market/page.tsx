import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import {
  expireStaleListings,
  formatPrice,
  listActiveListings,
} from "@/lib/market/listings";
import { DC_META, DCS, type DcCode } from "@/lib/schema";
import { PageFrame } from "../_components/page-frame";
import { SectionHeader } from "../_components/section-header";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Market",
  description:
    "Classifieds for Hetzner Cloud server transfers. Listings only — payment and transfer happen off-site.",
  alternates: { canonical: "/market" },
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; dc?: string }>;
}) {
  const { type, dc } = await searchParams;
  const session = await getSession();
  await expireStaleListings();
  const listings = await listActiveListings({
    serverType: type?.toUpperCase(),
    locationCode: dc?.toUpperCase(),
  });

  return (
    <PageFrame observedAt={await getObservedAtLabel()} wide>
      <section className="flex flex-col gap-6 pt-10">
        <SectionHeader
          as="h1"
          kicker="Classifieds"
          title="Server transfer market"
          blurb="People list Cloud servers they want to hand off. Price and Hetzner project transfer stay between buyer and seller. Not escrow. Not affiliated with Hetzner."
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {session ? (
            <>
              <Link
                href="/market/new"
                className="text-accent underline-offset-4 hover:underline"
              >
                New listing
              </Link>
              <Link
                href="/market/mine"
                className="text-ink-soft underline-offset-4 hover:underline"
              >
                My listings
              </Link>
              <span className="text-ink-faint">{session.user.email}</span>
            </>
          ) : (
            <Link
              href="/login?next=/market"
              className="text-accent underline-offset-4 hover:underline"
            >
              Sign in to list or contact sellers
            </Link>
          )}
        </div>

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
            No active listings
            {type || dc
              ? ` for ${[type?.toUpperCase(), dc?.toUpperCase()].filter(Boolean).join(" · ")}`
              : ""}
            .
          </p>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {listings.map((listing) => {
              const loc = listing.locationCode as DcCode;
              const city = DC_META[loc]?.city ?? listing.locationCode;
              return (
                <li key={listing.id}>
                  <Link
                    href={`/market/${listing.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 hover:bg-paper-recessed"
                  >
                    <span className="font-medium text-ink">
                      <span className="font-mono">{listing.serverType}</span>
                      <span className="text-ink-soft"> · {city}</span>
                      <span className="mt-0.5 block text-sm font-normal text-ink-soft">
                        {listing.title}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-ink">
                      {formatPrice(listing.priceCents, listing.currency)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="max-w-[68ch] font-sans text-xs leading-relaxed text-ink-faint">
          Transfer uses Hetzner Cloud project invites (buyer creates project,
          invites seller, seller moves the server). This site only hosts
          classifieds. No payment handling. Buyer diligence on data wipe and
          account SMTP rules after transfer.
        </p>
      </section>
    </PageFrame>
  );
}
