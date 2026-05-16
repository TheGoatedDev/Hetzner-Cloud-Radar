import type { Metadata } from "next";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import { verifyEmailToken } from "@/lib/marketing/unsubscribe-token";
import { PageFrame } from "../_components/page-frame";
import { SectionHeader } from "../_components/section-header";
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

  return (
    <PageFrame observedAt={await getObservedAtLabel()}>
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
        />
      </section>
    </PageFrame>
  );
}
