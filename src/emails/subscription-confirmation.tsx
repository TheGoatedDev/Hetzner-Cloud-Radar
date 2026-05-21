import { Section } from "@react-email/components";
import type { DispatchPreferences } from "@/lib/marketing/preferences";
import { DEFAULT_DISPATCH_PREFERENCES } from "@/lib/marketing/preferences";
import { Layout } from "./_components/layout";
import { fontStack } from "./_components/theme";
import { MetaText, Prose } from "./_components/typography";

type Props = {
  email: string;
  preferences: DispatchPreferences;
};

export default function SubscriptionConfirmation({
  email = "you@example.com",
  preferences = DEFAULT_DISPATCH_PREFERENCES,
}: Partial<Props>) {
  const wantsSoldOut = preferences.events.includes("soldout");
  const wantsRestock = preferences.events.includes("restock");
  const eventCopy =
    wantsSoldOut && wantsRestock
      ? "a server type goes sold out or returns to stock"
      : wantsSoldOut
        ? "a server type goes sold out"
        : "a server type returns to stock";

  const subscribedTo = [
    wantsSoldOut ? "Sold-out events" : null,
    wantsRestock ? "Restocks" : null,
    preferences.families.length > 0
      ? `Families: ${preferences.families.map((family) => family.toUpperCase()).join(", ")}`
      : null,
    preferences.datacentres.length > 0
      ? `Datacentres: ${preferences.datacentres.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Layout
      preview="You are subscribed to Hetzner Cloud Radar dispatches."
      recipientEmail={email}
    >
      <Section>
        <Prose spacing="subscription">
          Thanks. <span style={{ fontFamily: fontStack.mono }}>{email}</span> is
          on the list. A short note will land when {eventCopy}.
        </Prose>
        <Prose tone="soft" spacing="subscription">
          Resend manages the address and preferences. No third-party analytics.
          Unsubscribe with the link in any dispatch.
        </Prose>
        <MetaText>Subscribed to: {subscribedTo}</MetaText>
      </Section>
    </Layout>
  );
}

SubscriptionConfirmation.PreviewProps = {
  email: "claude@login.thegoated.dev",
  preferences: DEFAULT_DISPATCH_PREFERENCES,
} satisfies Props;
