"use client";

import {
  DISPATCH_EVENTS,
  DISPATCH_SERVER_FAMILIES,
  type DispatchEvent,
} from "@/lib/marketing/preferences";
import { DC_META, DCS, type DcCode, type FamilyId } from "@/lib/schema";
import { dispatchServerFamilies } from "@/lib/server-families";

const FAMILY_OPTIONS = dispatchServerFamilies();

const EVENT_LABELS: Record<DispatchEvent, string> = {
  soldout: "Sold-out events",
  restock: "Restocks",
};

function toggleValue<T extends string>(
  values: readonly T[],
  value: T,
  checked: boolean,
): T[] {
  return checked
    ? [...new Set([...values, value])]
    : values.filter((item) => item !== value);
}

type GroupHeaderProps = {
  label: string;
  selected: number;
  total: number;
  disabled?: boolean;
  onToggleAll: () => void;
};

function GroupHeader({
  label,
  selected,
  total,
  disabled,
  onToggleAll,
}: GroupHeaderProps) {
  const allSelected = selected === total;
  return (
    <legend className="float-left mb-2 w-full p-0">
      <span className="flex w-full items-baseline justify-between gap-4">
        <span className="flex items-baseline gap-3 text-xs tracking-wide text-ink-faint">
          <span>{label}</span>
          <span className="font-mono text-2xs text-ink-faint">
            <span className="sr-only">
              {selected} of {total} selected
            </span>
            <span aria-hidden="true">
              {selected} / {total}
            </span>
          </span>
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleAll}
          className="min-h-6 font-mono text-2xs tracking-wide text-accent underline-offset-4 hover:underline disabled:opacity-50"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </span>
    </legend>
  );
}

type CheckRowProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  code: string;
  subtitle?: string;
};

function CheckRow({
  checked,
  disabled,
  onChange,
  code,
  subtitle,
}: CheckRowProps) {
  return (
    <label className="flex cursor-pointer items-baseline gap-3 py-1 text-sm hover:text-ink">
      <input
        type="checkbox"
        name={code}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 shrink-0 accent-accent"
      />
      <span className="min-w-[3.5rem] break-words font-mono text-ink">
        {code}
      </span>
      {subtitle ? (
        <span className="font-sans text-xs text-ink-faint">{subtitle}</span>
      ) : null}
    </label>
  );
}

export type PreferenceMatrixProps = {
  events: DispatchEvent[];
  families: FamilyId[];
  datacentres: DcCode[];
  onEventsChange: (next: DispatchEvent[]) => void;
  onFamiliesChange: (next: FamilyId[]) => void;
  onDatacentresChange: (next: DcCode[]) => void;
  disabled?: boolean;
};

export function PreferenceMatrix({
  events,
  families,
  datacentres,
  onEventsChange,
  onFamiliesChange,
  onDatacentresChange,
  disabled,
}: PreferenceMatrixProps) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <GroupHeader
          label="Events"
          selected={events.length}
          total={DISPATCH_EVENTS.length}
          disabled={disabled}
          onToggleAll={() =>
            onEventsChange(
              events.length === DISPATCH_EVENTS.length
                ? []
                : [...DISPATCH_EVENTS],
            )
          }
        />
        <div className="flex flex-col">
          {DISPATCH_EVENTS.map((event) => (
            <CheckRow
              key={event}
              checked={events.includes(event)}
              disabled={disabled}
              onChange={(checked) =>
                onEventsChange(toggleValue(events, event, checked))
              }
              code={EVENT_LABELS[event]}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <GroupHeader
          label="Server families"
          selected={families.length}
          total={DISPATCH_SERVER_FAMILIES.length}
          disabled={disabled}
          onToggleAll={() =>
            onFamiliesChange(
              families.length === DISPATCH_SERVER_FAMILIES.length
                ? []
                : [...DISPATCH_SERVER_FAMILIES],
            )
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {FAMILY_OPTIONS.map(({ id, meta }) => (
            <CheckRow
              key={id}
              checked={families.includes(id)}
              disabled={disabled}
              onChange={(checked) =>
                onFamiliesChange(toggleValue(families, id, checked))
              }
              code={meta.label}
              subtitle={meta.kicker}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <GroupHeader
          label="Datacentres"
          selected={datacentres.length}
          total={DCS.length}
          disabled={disabled}
          onToggleAll={() =>
            onDatacentresChange(
              datacentres.length === DCS.length ? [] : [...DCS],
            )
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {DCS.map((dc) => (
            <CheckRow
              key={dc}
              checked={datacentres.includes(dc)}
              disabled={disabled}
              onChange={(checked) =>
                onDatacentresChange(toggleValue(datacentres, dc, checked))
              }
              code={dc}
              subtitle={`${DC_META[dc].city}, ${DC_META[dc].country}`}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
