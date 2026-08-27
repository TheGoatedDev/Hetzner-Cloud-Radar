import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import { PageFrame } from "../../_components/page-frame";
import { SectionHeader } from "../../_components/section-header";
import { NewListingForm } from "./_components/new-listing-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New listing",
  robots: { index: false, follow: false },
};

export default async function NewListingPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/market/new");
  }

  return (
    <PageFrame observedAt={await getObservedAtLabel()}>
      <section className="flex flex-col gap-6 pt-10">
        <SectionHeader
          as="h1"
          kicker="Market"
          title="New listing"
          blurb="Cloud servers only. You handle payment and Hetzner transfer yourself. Listing expires in 21 days."
        />
        <NewListingForm />
      </section>
    </PageFrame>
  );
}
