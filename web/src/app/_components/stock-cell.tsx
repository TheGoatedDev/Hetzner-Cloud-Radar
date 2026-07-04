"use client";

import { DC_META, type DcCode, STOCK, type Stock } from "@/lib/schema";
import { AvailabilityHistoryPopover } from "./availability-history-popover";

export function StockCell({
  stock,
  dc,
  type,
}: {
  stock: Stock;
  dc: DcCode;
  type: string;
}) {
  const srLabel = `${type} in ${dc}, ${DC_META[dc].city}: ${STOCK[stock].label}`;

  if (stock === "not-offered") {
    return (
      <td className="px-0 py-3 text-center align-top sm:px-2">
        <span className="sr-only">{srLabel}</span>
        <span
          aria-hidden
          className={`inline-block text-base leading-none ${STOCK[stock].textClass}`}
        >
          {STOCK[stock].glyph}
        </span>
      </td>
    );
  }

  return (
    <td className="px-0 py-3 text-center align-top sm:px-2">
      <AvailabilityHistoryPopover type={type} dc={dc} currentStock={stock}>
        {({ triggerRef, triggerProps }) => (
          <button
            {...triggerProps}
            ref={triggerRef}
            className="inline-flex cursor-pointer items-center justify-center bg-transparent p-0 leading-none"
          >
            <span className="sr-only">
              {srLabel}. Activate for 14-day availability history.
            </span>
            <span
              aria-hidden
              className={`inline-block text-sm leading-none ${STOCK[stock].textClass}`}
            >
              {STOCK[stock].glyph}
            </span>
          </button>
        )}
      </AvailabilityHistoryPopover>
    </td>
  );
}
