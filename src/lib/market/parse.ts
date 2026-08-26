import { DCS, type DcCode } from "@/lib/schema";

const CLOUD_TYPE_RE =
  /\b((?:CCX|CAX|CPX|CX|CXM|CCX[A-Z]?|CAX[A-Z]?)\d{1,3}(?:-?CE)?)\b/i;

const TRANSFER_RE =
  /\b(transfer|handoff|hand[- ]?off|take[- ]?over|project invite|übertrag|abgeben|abgabe)\b/i;

const CLOUD_SIGNAL_RE =
  /\b(cloud|hcloud|hetzner cloud|project invite|ccx|cax|cpx|cx\d)\b/i;

const DEDICATED_ONLY_RE =
  /\b(auction|dedicated|root server|ex\d{2}|ax\d{2}|sx\d{2}|px\d{2}|gex\d{2}|robot)\b/i;

const PRICE_RE =
  /(?:€|eur|euro)\s*(\d{1,5})(?:[.,]\d{1,2})?|(\d{1,5})(?:[.,]\d{1,2})?\s*(?:€|eur|euro)/i;

export type ParsedListingFields = {
  serverType: string | null;
  locationCode: DcCode | null;
  priceCents: number | null;
};

export function isCloudTransferPost(title: string, body: string): boolean {
  const text = `${title}\n${body}`;
  if (!TRANSFER_RE.test(text) && !CLOUD_TYPE_RE.test(text)) return false;
  if (CLOUD_TYPE_RE.test(text) || CLOUD_SIGNAL_RE.test(text)) {
    if (DEDICATED_ONLY_RE.test(text) && !CLOUD_TYPE_RE.test(text)) return false;
    return true;
  }
  return false;
}

export function parseListingFields(
  title: string,
  body: string,
): ParsedListingFields {
  const text = `${title}\n${body}`;
  const typeMatch = text.match(CLOUD_TYPE_RE);
  const serverType = typeMatch?.[1]?.toUpperCase() ?? null;

  let locationCode: DcCode | null = null;
  for (const dc of DCS) {
    if (new RegExp(`\\b${dc}\\b`, "i").test(text)) {
      locationCode = dc;
      break;
    }
  }
  if (!locationCode) {
    const cityMap: [RegExp, DcCode][] = [
      [/\bfalkenstein\b/i, "FSN1"],
      [/\bnuremberg|nürnberg|nuernberg\b/i, "NBG1"],
      [/\bhelsinki\b/i, "HEL1"],
      [/\bashburn\b/i, "ASH"],
      [/\bhillsboro\b/i, "HIL"],
      [/\bsingapore\b/i, "SIN"],
    ];
    for (const [re, code] of cityMap) {
      if (re.test(text)) {
        locationCode = code;
        break;
      }
    }
  }

  let priceCents: number | null = null;
  const priceMatch = text.match(PRICE_RE);
  if (priceMatch) {
    const raw = priceMatch[1] ?? priceMatch[2];
    const euros = Number(raw);
    if (Number.isFinite(euros) && euros > 0 && euros < 100_000) {
      priceCents = Math.round(euros) * 100;
    }
  }

  return { serverType, locationCode, priceCents };
}
