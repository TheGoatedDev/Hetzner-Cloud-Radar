import { DCS, type DcCode, type FamilyId } from "@/lib/schema";

export const DISPATCH_EVENTS = ["soldout", "restock"] as const;
export type DispatchEvent = (typeof DISPATCH_EVENTS)[number];

export const SERVER_FAMILIES = ["cx", "cax", "cpx", "ccx"] as const;

export const SERVER_FAMILY_KICKERS: Record<FamilyId, string> = {
  cx: "Shared Intel",
  cax: "ARM Ampere",
  cpx: "Shared AMD",
  ccx: "Dedicated AMD",
};

export type DispatchPreferences = {
  events: DispatchEvent[];
  families: FamilyId[];
  datacentres: DcCode[];
};

export type TopicParts = {
  event: DispatchEvent;
  family: FamilyId;
  datacentre: DcCode;
};

export const DEFAULT_DISPATCH_PREFERENCES: DispatchPreferences = {
  events: [...DISPATCH_EVENTS],
  families: [...SERVER_FAMILIES],
  datacentres: [...DCS],
};

const TOPIC_PREFIX = "hcr";

export function normalizeDispatchPreferences(
  input: DispatchPreferences,
): DispatchPreferences {
  return {
    events: DISPATCH_EVENTS.filter((event) => input.events.includes(event)),
    families: SERVER_FAMILIES.filter((family) =>
      input.families.includes(family),
    ),
    datacentres: DCS.filter((datacentre) =>
      input.datacentres.includes(datacentre),
    ),
  };
}

export function topicKey(parts: TopicParts) {
  return [
    TOPIC_PREFIX,
    parts.event,
    parts.family,
    parts.datacentre.toLowerCase(),
  ].join(":");
}

export function parseTopicKey(name: string): TopicParts | null {
  const [prefix, event, family, datacentre] = name.split(":");

  if (
    prefix !== TOPIC_PREFIX ||
    !DISPATCH_EVENTS.includes(event as DispatchEvent) ||
    !SERVER_FAMILIES.includes(family as FamilyId)
  ) {
    return null;
  }

  const dc = datacentre?.toUpperCase();
  if (!DCS.includes(dc as DcCode)) return null;

  return {
    event: event as DispatchEvent,
    family: family as FamilyId,
    datacentre: dc as DcCode,
  };
}

export function allTopicParts(): TopicParts[] {
  return DISPATCH_EVENTS.flatMap((event) =>
    SERVER_FAMILIES.flatMap((family) =>
      DCS.map((datacentre) => ({ event, family, datacentre })),
    ),
  );
}

export function selectedTopicKeys(preferences: DispatchPreferences) {
  const normalized = normalizeDispatchPreferences(preferences);

  return normalized.events.flatMap((event) =>
    normalized.families.flatMap((family) =>
      normalized.datacentres.map((datacentre) =>
        topicKey({ event, family, datacentre }),
      ),
    ),
  );
}

export function dispatchEventFromState(state: string): DispatchEvent {
  return state === "ongoing-out" ? "soldout" : "restock";
}

export function hasAnyPreference(preferences: DispatchPreferences) {
  const normalized = normalizeDispatchPreferences(preferences);

  return (
    normalized.events.length > 0 &&
    normalized.families.length > 0 &&
    normalized.datacentres.length > 0
  );
}
