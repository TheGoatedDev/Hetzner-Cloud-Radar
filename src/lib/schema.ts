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
};

export const STOCK: Record<Stock, StockMeta> = {
  available: {
    label: "Available",
    glyph: "●",
    textClass: "text-operational",
    bgClass: "bg-operational",
  },
  limited: {
    label: "Limited",
    glyph: "◐",
    textClass: "text-degraded",
    bgClass: "bg-degraded",
  },
  "sold-out": {
    label: "Sold out",
    glyph: "■",
    textClass: "text-down",
    bgClass: "bg-down",
  },
  "not-offered": {
    label: "Not offered",
    glyph: "·",
    textClass: "text-ink-faint",
    bgClass: "bg-ink-faint",
  },
  unknown: {
    label: "Unknown",
    glyph: "○",
    textClass: "text-ink-faint",
    bgClass: "bg-ink-faint",
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

export type ServerType = {
  code: string;
  cores: number;
  ram: number;
  disk: number;
  stock: Record<DcCode, Stock>;
};

export type FamilyId = "cx" | "cax" | "cpx" | "ccx";

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
  limited: number;
  soldOut: number;
};
