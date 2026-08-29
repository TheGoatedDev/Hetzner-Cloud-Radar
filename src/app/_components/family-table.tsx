import { DC_META, DCS, type Family } from "@/lib/schema";
import { StockCell } from "./stock-cell";

export function FamilyTable({ family }: { family: Family }) {
    return (
        <table className="w-full border-collapse text-sm tabular-nums">
            <caption className="sr-only">
                {family.label} {family.kicker} availability per datacentre
            </caption>
            <thead>
                <tr className="text-2xs text-ink-faint sm:text-xs">
                    <th
                        scope="col"
                        className="w-[64px] px-1 py-2 text-left font-medium sm:w-[88px] sm:px-2"
                    >
                        Type
                    </th>
                    <th
                        scope="col"
                        className="hidden px-2 py-2 text-left font-medium sm:table-cell"
                    >
                        Spec
                    </th>
                    {DCS.map((dc) => (
                        <th
                            key={dc}
                            scope="col"
                            className="w-[36px] px-0 py-2 text-center font-medium uppercase tracking-[0.08em] sm:w-[60px] sm:px-2 sm:tracking-[0.1em]"
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
                            className="px-1 py-1 text-left align-middle font-medium tracking-[0.04em] text-ink sm:px-2"
                        >
                            <div className="flex flex-col gap-0.5">
                                <span>{t.code}</span>
                                <span className="text-2xs font-normal tracking-normal text-ink-faint sm:hidden">
                                    {t.cores}c&nbsp;·&nbsp;{t.ram}G
                                </span>
                            </div>
                        </th>
                        <td className="hidden px-2 py-1 text-left align-middle text-xs text-ink-soft sm:table-cell">
                            {t.cores}&nbsp;vCPU · {t.ram}&nbsp;GB · {t.disk}
                            &nbsp;GB
                        </td>
                        {DCS.map((dc) => (
                            <StockCell
                                key={dc}
                                stock={t.stock[dc]}
                                dc={dc}
                                type={t.code}
                                familyId={family.id}
                            />
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
