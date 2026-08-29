import type { Metadata } from "next";
import { getObservedAtLabel } from "@/lib/availability/read-model";
import type { DispatchPreferences } from "@/lib/marketing/preferences";
import { getMarketingContactPreferences } from "@/lib/marketing/resend";
import { verifyEmailToken } from "@/lib/marketing/unsubscribe-token";
import { PageFrame } from "../_components/page-frame";
import { SectionHeader } from "../_components/section-header";
import { UnsubscribeForm } from "./_components/unsubscribe-form";

export const metadata: Metadata = {
    title: "Unsubscribe",
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
    const tokenValid =
        !!lower && !!token && (await verifyEmailToken(lower, token));
    let initialPreferences: DispatchPreferences | null = null;
    let preferenceLoadError: string | null = null;

    if (tokenValid) {
        try {
            initialPreferences = await getMarketingContactPreferences({
                email: lower,
            });
        } catch (error) {
            preferenceLoadError =
                error instanceof Error
                    ? error.message
                    : "Could not load current preferences.";
        }
    }

    return (
        <PageFrame observedAt={await getObservedAtLabel()}>
            <section className="flex flex-col gap-6 pt-10">
                <SectionHeader
                    as="h1"
                    kicker="Mailing list"
                    title="Unsubscribe"
                    blurb="Remove your address from Hetzner Cloud Radar dispatches, or keep just one type of alert. The change applies immediately."
                />

                <UnsubscribeForm
                    prefilledEmail={tokenValid ? lower : ""}
                    prefilledToken={tokenValid && token ? token : ""}
                    emailLocked={tokenValid}
                    initialPreferences={initialPreferences}
                    preferenceLoadError={preferenceLoadError}
                />
            </section>
        </PageFrame>
    );
}
