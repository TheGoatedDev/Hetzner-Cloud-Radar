import { STOCK, type Stock } from "@/lib/schema";

export function StockGlyph({
    stock,
    className = "",
}: {
    stock: Stock;
    className?: string;
}) {
    return (
        <span
            aria-hidden
            className={`inline-block leading-none ${STOCK[stock].textClass} ${className}`}
        >
            {STOCK[stock].glyph}
        </span>
    );
}
