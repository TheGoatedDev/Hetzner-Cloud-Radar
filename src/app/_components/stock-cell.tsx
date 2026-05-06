import { DC_META, type DcCode, STOCK, type Stock } from "@/lib/schema";

export function StockCell({
  stock,
  dc,
  type,
}: {
  stock: Stock;
  dc: DcCode;
  type: string;
}) {
  return (
    <td className="px-2 py-2 text-center align-middle">
      <span className="sr-only">
        {type} in {dc}, {DC_META[dc].city}: {STOCK[stock].label}
      </span>
      <span
        aria-hidden
        className={`inline-block leading-none ${STOCK[stock].textClass} ${
          stock === "not-offered" ? "text-base" : "text-sm"
        }`}
      >
        {STOCK[stock].glyph}
      </span>
    </td>
  );
}
