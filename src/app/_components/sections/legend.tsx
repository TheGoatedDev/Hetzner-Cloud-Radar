import { STOCK, type Stock } from "@/lib/schema";
import { Eyebrow } from "../eyebrow";
import { StockGlyph } from "../stock-glyph";

const LEGEND_STATES: Stock[] = [
    "available",
    "limited",
    "sold-out",
    "not-offered",
];

export function Legend() {
    return (
        <section className="flex flex-col gap-3 pt-10">
            <Eyebrow>Legend</Eyebrow>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-soft">
                {LEGEND_STATES.map((s) => (
                    <li key={s} className="flex items-baseline gap-2">
                        <StockGlyph stock={s} className="w-3" />
                        <span>{STOCK[s].label}</span>
                    </li>
                ))}
            </ul>
            <p className="text-2xs text-ink-faint">
                Select a cell for 24-hour history.
            </p>
        </section>
    );
}
