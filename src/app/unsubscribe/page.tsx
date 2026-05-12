import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import {
  formatObservedAt,
  getLatestPollAt,
  POLL_CADENCE,
} from "@/lib/availability/read-model";
import { getDb } from "@/lib/db/client";
import { mailingSubscribers } from "@/lib/db/schema";
import { verifyEmailToken } from "@/lib/marketing/unsubscribe-token";
import { SectionHeader } from "../_components/section-header";
import { Masthead } from "../_components/sections/masthead";
import { PageFooter } from "../_components/sections/page-footer";
import { UnsubscribeForm } from "./_components/unsubscribe-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe · Hetzner Cloud Radar",
  description: "Unsubscribe from Hetzner Cloud Radar dispatches.",
  robots: { index: false, follow: false },
};

type Search = { email?: string; token?: string };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { email, token } = await searchParams;
  const lower = email?.toLowerCase() ?? "";
  const tokenValid = !!lower && !!token && verifyEmailToken(lower, token);

  let alreadyUnsubscribed = false;

  if (tokenValid) {
    const rows = await getDb()
      .select({ unsubscribedAt: mailingSubscribers.unsubscribedAt })
      .from(mailingSubscribers)
      .where(eq(mailingSubscribers.email, lower))
      .limit(1);

    alreadyUnsubscribed = rows[0]?.unsubscribedAt != null;
  }

  const latestAt = await getLatestPollAt();
  const observedAt = latestAt
    ? formatObservedAt(latestAt)
    : "awaiting first poll";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-10 pb-20 sm:px-10 sm:pt-16">
      <Masthead observedAt={observedAt} />

      <section className="flex flex-col gap-6 pt-10">
        <SectionHeader
          kicker="Mailing list"
          title="Unsubscribe"
          blurb="Remove your address from Hetzner Cloud Radar dispatches, or keep just one type of alert. The change applies immediately."
        />

        <UnsubscribeForm
          prefilledEmail={tokenValid ? lower : ""}
          prefilledToken={tokenValid && token ? token : ""}
          emailLocked={tokenValid}
          alreadyUnsubscribed={alreadyUnsubscribed}
        />
      </section>

      <PageFooter pollCadence={POLL_CADENCE} />
    </div>
  );
}
