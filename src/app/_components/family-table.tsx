import { DC_META, DCS, type Family } from "@/lib/schema";
import { StockCell } from "./stock-cell";

export function FamilyTable({ family }: { family: Family }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums">
        <caption className="sr-only">
          {family.label} {family.kicker} availability per datacentre
        </caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            <th
              scope="col"
              className="w-[88px] px-2 py-2 text-left font-medium"
            >
              Type
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Spec
            </th>
            {DCS.map((dc) => (
              <th
                key={dc}
                scope="col"
                className="w-[60px] px-2 py-2 text-center font-medium"
                title={`${DC_META[dc].city}, ${DC_META[dc].country}`}
              >
                {dc}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {family.types.map((t, i) => (
            <tr
              key={t.code}
              className={i > 0 ? "border-t border-hairline" : ""}
            >
              <th
                scope="row"
                className="px-2 py-3 text-left font-medium tracking-[0.04em] text-ink"
              >
                {t.code}
              </th>
              <td className="px-2 py-3 text-left text-xs text-ink-soft">
                {t.cores} vCPU · {t.ram} GB · {t.disk} GB
              </td>
              {DCS.map((dc) => (
                <StockCell key={dc} stock={t.stock[dc]} dc={dc} type={t.code} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
