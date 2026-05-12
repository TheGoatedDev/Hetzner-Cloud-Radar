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
  baselineNote: string;
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

export default function StockOut({
  serverType = "CCX33",
  serverSpec = "8 vCPU dedicated · 32 GB RAM · 240 GB",
  region = "FSN1",
  regionCity = "Falkenstein",
  observedAt = "2026-05-06 14:32:18 UTC",
  baselineNote = "Baseline availability for this type in this region over the last 30 days is 92%.",
  recipientEmail,
}: Partial<Props>) {
  const title = `${serverType} sold out in ${region}`;

  return (
    <Layout
      preview={`${serverType} went sold out in ${regionCity} (${region}).`}
      observedAt={observedAt}
      recipientEmail={recipientEmail}
    >
      <DispatchMeta
        state="sold-out"
        kicker="Stock event"
        title={title}
        rows={[
          { label: "Type", value: `${serverType} (${serverSpec})` },
          { label: "Region", value: `${region} · ${regionCity}` },
          { label: "Observed", value: observedAt },
        ]}
      />
      <Text style={prose}>
        {serverType} is no longer available for new server creation in{" "}
        {regionCity}. Existing servers are unaffected. The next dispatch will
        land when {region} returns to stock.
      </Text>
      <Text style={proseSoft}>{baselineNote}</Text>
    </Layout>
  );
}

StockOut.PreviewProps = {
  serverType: "CCX33",
  serverSpec: "8 vCPU dedicated · 32 GB RAM · 240 GB",
  region: "FSN1",
  regionCity: "Falkenstein",
  observedAt: "2026-05-06 14:32:18 UTC",
  baselineNote:
    "Baseline availability for this type in this region over the last 30 days is 92%.",
} satisfies Props;
