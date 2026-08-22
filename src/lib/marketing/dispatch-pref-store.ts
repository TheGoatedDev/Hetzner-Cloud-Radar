import { create } from "zustand";
import {
  DEFAULT_DISPATCH_PREFERENCES,
  type DispatchEvent,
} from "@/lib/marketing/preferences";
import type { DcCode, FamilyId } from "@/lib/schema";

type DispatchPrefStore = {
  events: DispatchEvent[];
  families: FamilyId[];
  datacentres: DcCode[];
  locked: boolean;
  setEvents: (next: DispatchEvent[]) => void;
  setFamilies: (next: FamilyId[]) => void;
  setDatacentres: (next: DcCode[]) => void;
  lock: () => void;
};

export const useDispatchPrefStore = create<DispatchPrefStore>((set) => ({
  events: [...DEFAULT_DISPATCH_PREFERENCES.events],
  families: [...DEFAULT_DISPATCH_PREFERENCES.families],
  datacentres: [...DEFAULT_DISPATCH_PREFERENCES.datacentres],
  locked: false,
  setEvents: (events) => set((s) => (s.locked ? s : { events })),
  setFamilies: (families) => set((s) => (s.locked ? s : { families })),
  setDatacentres: (datacentres) => set((s) => (s.locked ? s : { datacentres })),
  lock: () => set({ locked: true }),
}));
