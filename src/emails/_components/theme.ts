// Brand colours for email rendering. Email clients do not support OKLCH or
// CSS variables reliably, so the OKLCH tokens used in the app are flattened
// to sRGB hex here. Keep these in rough sync with `src/app/globals.css`.

export const theme = {
  paper: "#fbf8f4",
  paperRecessed: "#f4f1ec",
  ink: "#221f1c",
  inkSoft: "#6a6764",
  inkFaint: "#9a9794",
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

export const STOCK_GLYPH = {
  available: "●",
  limited: "◐",
  "sold-out": "■",
  "not-offered": "·",
  unknown: "○",
} as const;

export const STOCK_COLOR = {
  available: theme.operational,
  limited: theme.degraded,
  "sold-out": theme.down,
  "not-offered": theme.inkFaint,
  unknown: theme.inkFaint,
} as const;

export const STOCK_LABEL = {
  available: "Available",
  limited: "Limited",
  "sold-out": "Sold out",
  "not-offered": "Not offered",
  unknown: "Unknown",
} as const;

export type StockState = keyof typeof STOCK_GLYPH;
