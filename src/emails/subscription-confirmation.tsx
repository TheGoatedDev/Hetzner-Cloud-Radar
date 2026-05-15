import { Section } from "@react-email/components";
import { Layout } from "./_components/layout";
import { fontStack } from "./_components/theme";
import { MetaText, Prose } from "./_components/typography";

type Props = {
  email: string;
  events: { soldOut: boolean; restock: boolean };
};

export default function SubscriptionConfirmation({
  email = "you@example.com",
  events = { soldOut: true, restock: true },
}: Partial<Props>) {
  const eventCopy =
    events.soldOut && events.restock
      ? "a server type goes sold out or returns to stock"
      : events.soldOut
        ? "a server type goes sold out"
        : "a server type returns to stock";

  const subscribedTo = [
    events.soldOut ? "Sold-out events" : null,
    events.restock ? "Restocks" : null,
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
          We store the address and nothing else. No tracking pixels, no
          third-party analytics. Unsubscribe with the link in any dispatch.
        </Prose>
        <MetaText>Subscribed to: {subscribedTo}</MetaText>
      </Section>
    </Layout>
  );
}

SubscriptionConfirmation.PreviewProps = {
  email: "claude@login.thegoated.dev",
  events: { soldOut: true, restock: true },
} satisfies Props;
