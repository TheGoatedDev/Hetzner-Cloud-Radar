import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import {
  expireStaleListings,
  formatPrice,
  getListing,
} from "@/lib/market/listings";
import { DC_META, type DcCode } from "@/lib/schema";
import { PageFrame } from "../../_components/page-frame";
import { SectionHeader } from "../../_components/section-header";
import { ListingActions } from "./_components/listing-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing" };
  return {
    title: `${listing.serverType} · ${listing.locationCode}`,
    description: listing.title,
    robots: { index: listing.status === "active", follow: true },
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  await expireStaleListings();
  const session = await getSession();
  const listing = await getListing(id, session?.user.id);
  if (!listing) notFound();

  const city =
    DC_META[listing.locationCode as DcCode]?.city ?? listing.locationCode;
  const loginHref = `/login?next=${encodeURIComponent(`/market/${id}`)}`;

  return (
    <PageFrame observedAt={await getObservedAtLabel()}>
      <section className="flex flex-col gap-6 pt-10">
        <p className="text-xs text-ink-soft">
          <Link href="/market" className="hover:text-accent">
            Market
          </Link>
          <span className="text-ink-faint"> / </span>
          <span className="font-mono text-ink">{listing.serverType}</span>
        </p>

        <SectionHeader
          as="h1"
          kicker={`${listing.serverType} · ${city} (${listing.locationCode})`}
          title={listing.title}
          blurb={`${formatPrice(listing.priceCents, listing.currency)} · ${listing.status}`}
        />

        {listing.body ? (
          <p className="max-w-[68ch] whitespace-pre-wrap font-sans text-base leading-[1.7] text-ink-soft">
            {listing.body}
          </p>
        ) : null}

        {listing.includes ? (
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-ink">Includes</h2>
            <p className="whitespace-pre-wrap font-sans text-sm text-ink-soft">
              {listing.includes}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border border-hairline bg-paper-recessed p-4">
          <h2 className="text-sm font-medium text-ink">Seller contact</h2>
          {listing.sellerEmail ? (
            <a
              href={`mailto:${listing.sellerEmail}`}
              className="font-mono text-sm text-accent underline-offset-4 hover:underline"
            >
              {listing.sellerEmail}
            </a>
          ) : session ? (
            <p className="font-sans text-sm text-ink-soft">
              Contact hidden (listing not active).
            </p>
          ) : (
            <p className="font-sans text-sm text-ink-soft">
              <Link
                href={loginHref}
                className="text-accent underline-offset-4 hover:underline"
              >
                Sign in
              </Link>{" "}
              to see seller email.
            </p>
          )}
        </div>

        {listing.isOwner ? (
          <ListingActions id={listing.id} status={listing.status} />
        ) : null}

        <div className="flex flex-col gap-3 pt-2">
          <h2 className="text-lg font-medium tracking-tight text-ink">
            How Cloud transfer works
          </h2>
          <ol className="max-w-[68ch] list-decimal space-y-2 pl-5 font-sans text-sm leading-relaxed text-ink-soft">
            <li>
              Agree price off-platform. This site does not hold money or verify
              ownership.
            </li>
            <li>
              Buyer creates a Hetzner Cloud project and invites the seller as a
              member.
            </li>
            <li>
              Seller accepts, then uses{" "}
              <span className="text-ink">Transfer to project</span> on the
              server (and any volumes / floating IPs).
            </li>
            <li>
              Buyer becomes billing owner, moves the resource to a private
              project, removes the seller.
            </li>
          </ol>
          <p className="max-w-[68ch] font-sans text-xs text-ink-faint">
            Official docs: product migration on docs.hetzner.com. After
            transfer, SMTP ports 25/465 follow the buyer account. Wipe data
            before transfer if you are the seller.
          </p>
        </div>
      </section>
    </PageFrame>
  );
}
