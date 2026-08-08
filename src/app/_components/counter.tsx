import type { ReactNode } from "react";

export function Counter({
  label,
  value,
  delta,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink tabular-nums">
        {value}
        {delta ? (
          <span className="ml-2 text-ink-faint tabular-nums">{delta}</span>
        ) : null}
      </dd>
    </div>
  );
}
