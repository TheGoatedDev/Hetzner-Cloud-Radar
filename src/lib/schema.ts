export type Stock =
  | "available"
  | "limited"
  | "sold-out"
  | "not-offered"
  | "unknown";

type StockMeta = {
  label: string;
  glyph: string;
  textClass: string;
  bgClass: string;
  cssVar: string;
};

export const STOCK: Record<Stock, StockMeta> = {
  available: {
    label: "Available",
    glyph: "●",
    textClass: "text-operational",
    bgClass: "bg-operational",
    cssVar: "var(--status-operational)",
  },
  limited: {
    label: "Limited",
    glyph: "◐",
    textClass: "text-degraded",
    bgClass: "bg-degraded",
    cssVar: "var(--status-degraded)",
  },
  "sold-out": {
    label: "Sold out",
    glyph: "■",
    textClass: "text-down",
    bgClass: "bg-down",
    cssVar: "var(--status-down)",
  },
  "not-offered": {
    label: "Not offered",
    glyph: "·",
    textClass: "text-ink-faint",
    bgClass: "bg-ink-faint",
    cssVar: "var(--ink-faint)",
  },
  unknown: {
    label: "Unknown",
    glyph: "○",
    textClass: "text-ink-faint",
    bgClass: "bg-ink-faint",
    cssVar: "var(--ink-faint)",
  },
};

export const DCS = ["NBG1", "FSN1", "HEL1", "ASH", "HIL", "SIN"] as const;
export type DcCode = (typeof DCS)[number];

export const DC_META: Record<DcCode, { city: string; country: string }> = {
  NBG1: { city: "Nuremberg", country: "DE" },
  FSN1: { city: "Falkenstein", country: "DE" },
  HEL1: { city: "Helsinki", country: "FI" },
  ASH: { city: "Ashburn", country: "US" },
  HIL: { city: "Hillsboro", country: "US" },
  SIN: { city: "Singapore", country: "SG" },
};

type ServerType = {
  code: string;
  cores: number;
  ram: number;
  disk: number;
  stock: Record<DcCode, Stock>;
};

export type FamilyId = string;

export type Family = {
  id: FamilyId;
  label: string;
  kicker: string;
  blurb: string;
  types: ServerType[];
};

export type StockEvent = {
  id: string;
  startedAt: string;
  resolvedAt: string | null;
  durationLabel: string;
  scope: string;
  title: string;
  body: string;
  state: "ongoing-out" | "resolved-restock" | "ongoing-rollout";
};

export type SupplyDay = {
  date: string;
  available: number;
  limited: number;
  soldOut: number;
};

export const SUPPLY_SERIES = [
  { key: "available", stock: "available" },
  { key: "limited", stock: "limited", label: "Limited (flickered)" },
  { key: "soldOut", stock: "sold-out" },
] as const satisfies ReadonlyArray<{
  key: keyof Omit<SupplyDay, "date">;
  stock: Stock;
  label?: string;
}>;

export function sumSupplyDay(day: SupplyDay) {
  return SUPPLY_SERIES.reduce((total, series) => total + day[series.key], 0);
}

export function formatChartLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const month = d.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });

  return `${month} ${d.getUTCDate()}`;
}
