import { Section, Text } from "@react-email/components";
import { Layout } from "./_components/layout";
import { fontStack, theme } from "./_components/theme";

type Props = {
  email: string;
  events: { soldOut: boolean; restock: boolean };
};

const prose = {
  margin: "0 0 14px",
  fontFamily: fontStack.sans,
  fontSize: "15px",
  lineHeight: 1.55,
  color: theme.ink,
};

const proseSoft = {
  ...prose,
  color: theme.inkSoft,
};

const meta = {
  margin: "16px 0 0",
  fontFamily: fontStack.mono,
  fontSize: "12px",
  color: theme.inkFaint,
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
        <Text style={prose}>
          Thanks. <span style={{ fontFamily: fontStack.mono }}>{email}</span> is
          on the list. A short note will land when {eventCopy}.
        </Text>
        <Text style={proseSoft}>
          We store the address and nothing else. No tracking pixels, no
          third-party analytics. Unsubscribe with the link in any dispatch.
        </Text>
        <Text style={meta}>Subscribed to: {subscribedTo}</Text>
      </Section>
    </Layout>
  );
}

SubscriptionConfirmation.PreviewProps = {
  email: "claude@login.thegoated.dev",
  events: { soldOut: true, restock: true },
} satisfies Props;
