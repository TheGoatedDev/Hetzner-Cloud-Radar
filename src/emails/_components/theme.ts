import type { Stock } from "@/lib/schema";

export const theme = {
  paper: "#fbf8f4",
  paperRecessed: "#f4f1ec",
  ink: "#221f1c",
  inkSoft: "#6a6764",
  inkFaint: "#6e6b69",
  hairline: "#d9d6d1",
  hairlineStrong: "#bcb9b4",
  accent: "#b95535",
  accentDeep: "#962f12",
  operational: "#3f3c39",
  degraded: "#a07a30",
  down: "#8c2f17",
} as const;

export const fontStack = {
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
  sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif",
} as const;

export const STOCK_COLOR: Record<Stock, string> = {
  available: theme.operational,
  limited: theme.degraded,
  "sold-out": theme.down,
  "not-offered": theme.inkFaint,
  unknown: theme.inkFaint,
};
