import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import {
  expireStaleListings,
  formatPrice,
  listMyListings,
} from "@/lib/market/listings";
import { PageFrame } from "../../_components/page-frame";
import { SectionHeader } from "../../_components/section-header";
import { SignOutButton } from "./_components/sign-out-button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My listings",
  robots: { index: false, follow: false },
};

export default async function MyListingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/market/mine");
  }

  await expireStaleListings();
  const listings = await listMyListings(session.user.id);

  return (
    <PageFrame observedAt={await getObservedAtLabel()}>
      <section className="flex flex-col gap-6 pt-10">
        <SectionHeader
          as="h1"
          kicker="Market"
          title="My listings"
          blurb={session.user.email}
        />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/market/new"
            className="text-accent underline-offset-4 hover:underline"
          >
            New listing
          </Link>
          <Link
            href="/market"
            className="text-ink-soft underline-offset-4 hover:underline"
          >
            Browse market
          </Link>
          <SignOutButton />
        </div>

        {listings.length === 0 ? (
          <p className="font-sans text-base text-ink-soft">No listings yet.</p>
        ) : (
          <ul className="divide-y divide-hairline border-y border-hairline">
            {listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/market/${listing.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 hover:bg-paper-recessed"
                >
                  <span>
                    <span className="font-mono font-medium text-ink">
                      {listing.serverType}
                    </span>
                    <span className="text-ink-soft">
                      {" "}
                      · {listing.locationCode} · {listing.status}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">
                      {listing.title}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatPrice(listing.priceCents, listing.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}
