import { Text } from "@react-email/components";
import type { ReactNode } from "react";
import { fontStack, theme } from "./theme";

const prose = {
  margin: "20px 0 0",
  fontFamily: fontStack.sans,
  fontSize: "15px",
  lineHeight: 1.6,
  color: theme.ink,
};

const subscriptionProse = {
  ...prose,
  margin: "0 0 14px",
  lineHeight: 1.55,
};

const meta = {
  margin: "16px 0 0",
  fontFamily: fontStack.mono,
  fontSize: "12px",
  color: theme.inkFaint,
};

export function Prose({
  children,
  tone = "default",
  spacing = "dispatch",
}: {
  children: ReactNode;
  tone?: "default" | "soft";
  spacing?: "dispatch" | "subscription";
}) {
  const base = spacing === "subscription" ? subscriptionProse : prose;

  return (
    <Text style={tone === "soft" ? { ...base, color: theme.inkSoft } : base}>
      {children}
    </Text>
  );
}

export function MetaText({ children }: { children: ReactNode }) {
  return <Text style={meta}>{children}</Text>;
}
