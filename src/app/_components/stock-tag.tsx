import { STOCK, type Stock } from "@/lib/schema";
import { StockGlyph } from "./stock-glyph";

export function StockTag({ stock, label }: { stock: Stock; label?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-2 text-[11px] font-medium uppercase tracking-[0.1em] ${STOCK[stock].textClass}`}
    >
      <StockGlyph stock={stock} />
      <span>{label ?? STOCK[stock].label}</span>
    </span>
  );
}
