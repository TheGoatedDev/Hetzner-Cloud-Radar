import type { FamilyId } from "@/lib/schema";

type FallbackServerType = {
  code: string;
  cores: number;
  ram: number;
  disk: number;
};

type ServerFamilyMeta = {
  visible: boolean;
  dispatchEnabled: boolean;
  order: number;
  label?: string;
  kicker?: string;
  blurb?: string;
  fallbackTypes?: ReadonlyArray<FallbackServerType>;
};

export type VisibleServerFamilyMeta = Required<
  Pick<ServerFamilyMeta, "label" | "kicker" | "blurb" | "fallbackTypes">
> &
  ServerFamilyMeta;

// visible controls public dashboard/API. dispatchEnabled controls preferences and Resend topics.
export const SERVER_FAMILY_META: Record<string, ServerFamilyMeta> = {
  cx: {
    visible: true,
    dispatchEnabled: true,
    order: 10,
    label: "CX",
    kicker: "Shared Intel",
    blurb: "Intel Xeon, shared vCPU. The default starter line.",
    fallbackTypes: [
      { code: "CX23", cores: 2, ram: 4, disk: 40 },
      { code: "CX33", cores: 4, ram: 8, disk: 80 },
      { code: "CX43", cores: 8, ram: 16, disk: 160 },
      { code: "CX53", cores: 16, ram: 32, disk: 320 },
    ],
  },
  cax: {
    visible: true,
    dispatchEnabled: true,
    order: 20,
    label: "CAX",
    kicker: "ARM Ampere",
    blurb:
      "Ampere Altra ARM. Originally EU-only; rollout to North America is in progress.",
    fallbackTypes: [
      { code: "CAX11", cores: 2, ram: 4, disk: 40 },
      { code: "CAX21", cores: 4, ram: 8, disk: 80 },
      { code: "CAX31", cores: 8, ram: 16, disk: 160 },
      { code: "CAX41", cores: 16, ram: 32, disk: 320 },
    ],
  },
  cpx: {
    visible: true,
    dispatchEnabled: true,
    order: 30,
    label: "CPX",
    kicker: "Shared AMD",
    blurb: "AMD EPYC, shared vCPU. Higher single-thread than CX.",
    fallbackTypes: [
      { code: "CPX11", cores: 2, ram: 2, disk: 40 },
      { code: "CPX21", cores: 3, ram: 4, disk: 80 },
      { code: "CPX31", cores: 4, ram: 8, disk: 160 },
      { code: "CPX41", cores: 8, ram: 16, disk: 240 },
      { code: "CPX51", cores: 16, ram: 32, disk: 360 },
    ],
  },
  ccx: {
    visible: true,
    dispatchEnabled: true,
    order: 40,
    label: "CCX",
    kicker: "Dedicated AMD",
    blurb:
      "AMD EPYC, dedicated vCPU. The historically-tight line; supply is the story.",
    fallbackTypes: [
      { code: "CCX13", cores: 2, ram: 8, disk: 80 },
      { code: "CCX23", cores: 4, ram: 16, disk: 160 },
      { code: "CCX33", cores: 8, ram: 32, disk: 240 },
      { code: "CCX43", cores: 16, ram: 64, disk: 360 },
      { code: "CCX53", cores: 32, ram: 128, disk: 600 },
      { code: "CCX63", cores: 48, ram: 192, disk: 960 },
    ],
  },
};

function validateServerFamilyMeta() {
  const orders = new Set<number>();

  for (const [family, meta] of Object.entries(SERVER_FAMILY_META)) {
    if (orders.has(meta.order)) {
      throw new Error(`Duplicate server family order: ${meta.order}`);
    }
    orders.add(meta.order);

    if (meta.dispatchEnabled && !meta.visible) {
      throw new Error(`${family} cannot enable dispatches while hidden`);
    }

    if (meta.visible) {
      if (!meta.label || !meta.kicker || !meta.blurb) {
        throw new Error(`${family} visible family metadata is incomplete`);
      }
      if (!meta.fallbackTypes || meta.fallbackTypes.length === 0) {
        throw new Error(`${family} visible family needs fallback types`);
      }
    }
  }
}

validateServerFamilyMeta();

function orderedFamilies(filter: (meta: ServerFamilyMeta) => boolean) {
  return Object.entries(SERVER_FAMILY_META)
    .filter(([, meta]) => filter(meta))
    .sort(([, a], [, b]) => a.order - b.order);
}

export function deriveServerFamilyId(code: string): FamilyId | null {
  const match = code
    .trim()
    .toLowerCase()
    .match(/^([a-z]+)\d+$/u);

  return match?.[1] ?? null;
}

export function visibleServerFamilyIds() {
  return orderedFamilies((meta) => meta.visible).map(([family]) => family);
}

export function dispatchServerFamilyIds() {
  return orderedFamilies((meta) => meta.dispatchEnabled).map(
    ([family]) => family,
  );
}

export function visibleServerFamilies() {
  return orderedFamilies((meta) => meta.visible).map(([id, meta]) => ({
    id,
    meta: meta as VisibleServerFamilyMeta,
  }));
}

export function dispatchServerFamilies() {
  return orderedFamilies((meta) => meta.dispatchEnabled).map(([id, meta]) => ({
    id,
    meta: meta as VisibleServerFamilyMeta,
  }));
}

export function isConfiguredServerFamily(family: string) {
  return family in SERVER_FAMILY_META;
}

export function isDispatchEnabledServerFamily(family: string) {
  return SERVER_FAMILY_META[family]?.dispatchEnabled === true;
}

export function serverFamilyOrder(family: string) {
  return SERVER_FAMILY_META[family]?.order ?? Number.MAX_SAFE_INTEGER;
}
