import { Section, Text } from "@react-email/components";
import {
  fontStack,
  STOCK_COLOR,
  STOCK_GLYPH,
  STOCK_LABEL,
  type StockState,
  theme,
} from "./theme";

const eyebrow = {
  margin: 0,
  fontSize: "10px",
  fontFamily: fontStack.mono,
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: theme.inkFaint,
};

const tagRow = {
  margin: "8px 0 0",
  fontSize: "11px",
  fontFamily: fontStack.mono,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const headline = {
  margin: "16px 0 8px",
  fontSize: "20px",
  fontFamily: fontStack.mono,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: theme.ink,
  lineHeight: 1.25,
};

const detailRow = {
  margin: "10px 0 0",
  fontSize: "13px",
  fontFamily: fontStack.mono,
  color: theme.inkSoft,
};

const detailLabel = {
  display: "inline-block" as const,
  width: "84px",
  color: theme.inkFaint,
};

const detailValue = {
  color: theme.ink,
};

export function DispatchMeta({
  state,
  kicker,
  title,
  rows,
}: {
  state: StockState;
  kicker: string;
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <Section>
      <Text style={eyebrow}>{kicker}</Text>
      <Text style={{ ...tagRow, color: STOCK_COLOR[state] }}>
        <span style={{ marginRight: "8px" }}>{STOCK_GLYPH[state]}</span>
        {STOCK_LABEL[state]}
      </Text>
      <Text style={headline}>{title}</Text>
      {rows.map((row) => (
        <Text key={row.label} style={detailRow}>
          <span style={detailLabel}>{row.label}</span>
          <span style={detailValue}>{row.value}</span>
        </Text>
      ))}
    </Section>
  );
}
