import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import { formatPrice, getListing, sourceLabel } from "@/lib/market/listings";
import { DC_META, type DcCode } from "@/lib/schema";
import { PageFrame } from "../../_components/page-frame";
import { SectionHeader } from "../../_components/section-header";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Listing" };
  return {
    title: listing.serverType
      ? `${listing.serverType} · ${listing.title}`
      : listing.title,
    description: listing.title,
    robots: { index: listing.status === "active", follow: true },
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const loc = listing.locationCode as DcCode | null;
  const city = loc ? (DC_META[loc]?.city ?? loc) : null;
  const kicker = [
    listing.serverType,
    city && loc ? `${city} (${loc})` : loc,
    sourceLabel(listing.source),
  ]
    .filter(Boolean)
    .join(" · ");

  const priceBlurb =
    listing.priceCents != null
      ? formatPrice(listing.priceCents, listing.currency)
      : "Price on source";

  return (
    <PageFrame observedAt={await getObservedAtLabel()}>
      <section className="flex flex-col gap-6 pt-10">
        <p className="text-xs text-ink-soft">
          <Link href="/market" className="hover:text-accent">
            Market
          </Link>
          <span className="text-ink-faint"> / </span>
          <span className="text-ink">{sourceLabel(listing.source)}</span>
        </p>

        <SectionHeader
          as="h1"
          kicker={kicker || sourceLabel(listing.source)}
          title={listing.title}
          blurb={`${priceBlurb} · ${listing.status}`}
        />

        {listing.author ? (
          <p className="font-sans text-sm text-ink-soft">
            Author on source:{" "}
            <span className="font-mono text-ink">{listing.author}</span>
          </p>
        ) : null}

        {listing.body ? (
          <p className="max-w-[68ch] whitespace-pre-wrap font-sans text-base leading-[1.7] text-ink-soft">
            {listing.body.length > 1200
              ? `${listing.body.slice(0, 1200)}…`
              : listing.body}
          </p>
        ) : null}

        <a
          href={listing.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit border border-ink bg-ink px-4 py-2 text-sm text-paper hover:bg-accent hover:border-accent"
        >
          Open original on {sourceLabel(listing.source)}
        </a>

        <div className="flex flex-col gap-3 pt-2">
          <h2 className="text-lg font-medium tracking-tight text-ink">
            How Cloud transfer works
          </h2>
          <ol className="max-w-[68ch] list-decimal space-y-2 pl-5 font-sans text-sm leading-relaxed text-ink-soft">
            <li>
              Agree price on the source thread. This site does not hold money or
              verify ownership.
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
