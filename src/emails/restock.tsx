import { Text } from "@react-email/components";
import { DispatchMeta } from "./_components/dispatch-meta";
import { Layout } from "./_components/layout";
import { fontStack, theme } from "./_components/theme";

type Props = {
  serverType: string;
  serverSpec: string;
  region: string;
  regionCity: string;
  observedAt: string;
  durationLabel: string;
  recipientEmail?: string;
};

const prose = {
  margin: "20px 0 0",
  fontFamily: fontStack.sans,
  fontSize: "15px",
  lineHeight: 1.6,
  color: theme.ink,
};

const proseSoft = {
  ...prose,
  color: theme.inkSoft,
};

export default function Restock({
  serverType = "CCX43",
  serverSpec = "16 vCPU dedicated · 64 GB RAM · 360 GB",
  region = "FSN1",
  regionCity = "Falkenstein",
  observedAt = "2026-05-04 11:02:14 UTC",
  durationLabel = "5 days, 2 hours",
  recipientEmail,
}: Partial<Props>) {
  const title = `${serverType} returned to ${region}`;

  return (
    <Layout
      preview={`${serverType} is back in ${regionCity} (${region}).`}
      observedAt={observedAt}
      recipientEmail={recipientEmail}
    >
      <DispatchMeta
        state="available"
        kicker="Stock event"
        title={title}
        rows={[
          { label: "Type", value: `${serverType} (${serverSpec})` },
          { label: "Region", value: `${region} · ${regionCity}` },
          { label: "Sold-out for", value: durationLabel },
          { label: "Observed", value: observedAt },
        ]}
      />
      <Text style={prose}>
        {serverType} is available again for new server creation in {regionCity}.
        Inventory may be thin for the first day; the next dispatch will land
        only if it leaves stock again.
      </Text>
      <Text style={proseSoft}>
        This restock follows a continuous sold-out window of {durationLabel}.
      </Text>
    </Layout>
  );
}

Restock.PreviewProps = {
  serverType: "CCX43",
  serverSpec: "16 vCPU dedicated · 64 GB RAM · 360 GB",
  region: "FSN1",
  regionCity: "Falkenstein",
  observedAt: "2026-05-04 11:02:14 UTC",
  durationLabel: "5 days, 2 hours",
} satisfies Props;
