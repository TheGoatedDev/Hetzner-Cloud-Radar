import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { fontStack, theme } from "./theme";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hetzner.thegoated.dev";

const body = {
  backgroundColor: theme.paper,
  margin: 0,
  padding: 0,
  fontFamily: fontStack.mono,
  color: theme.ink,
};

const container = {
  margin: "0 auto",
  padding: "32px 24px 48px",
  maxWidth: "560px",
};

const masthead = {
  borderBottom: `1px solid ${theme.hairlineStrong}`,
  paddingBottom: "16px",
  marginBottom: "24px",
};

const wordmark = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: theme.ink,
};

const observed = {
  margin: "8px 0 0",
  fontSize: "11px",
  color: theme.inkSoft,
};

const footer = {
  borderTop: `1px solid ${theme.hairlineStrong}`,
  paddingTop: "16px",
  marginTop: "32px",
  fontSize: "11px",
  color: theme.inkSoft,
};

const footerLine = {
  margin: "0 0 6px",
};

const footerFaint = {
  ...footerLine,
  color: theme.inkFaint,
};

const link = {
  color: theme.accent,
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};

export function Layout({
  preview,
  observedAt,
  children,
}: {
  preview: string;
  observedAt?: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={masthead}>
            <Text style={wordmark}>Hetzner Cloud Radar</Text>
            {observedAt ? (
              <Text style={observed}>
                Observed at{" "}
                <span style={{ color: theme.ink }}>{observedAt}</span>
              </Text>
            ) : null}
          </Section>

          {children}

          <Hr style={{ display: "none" }} />
          <Section style={footer}>
            <Text style={footerLine}>
              Independent observation of the public Hetzner Cloud API. Not
              affiliated with Hetzner Online GmbH.
            </Text>
            <Text style={footerFaint}>
              <Link href={`${baseUrl}/`} style={link}>
                Open the radar
              </Link>
              {"  ·  "}
              <Link href={`${baseUrl}/unsubscribe`} style={link}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
