import type { PropsWithChildren } from "react";
import { POLL_CADENCE } from "@/lib/availability/read-model";
import { Masthead } from "./sections/masthead";
import { PageFooter } from "./sections/page-footer";

export function PageFrame({
  children,
  observedAt,
  wide = false,
}: PropsWithChildren<{
  observedAt: string;
  wide?: boolean;
}>) {
  // outer w-full: body is flex-col; mx-auto alone shrinks shell to content width
  return (
    <div className="flex w-full flex-1 flex-col">
      <div
        className={`page-shell mx-auto flex w-full ${wide ? "max-w-5xl" : "max-w-3xl"} flex-1 flex-col`}
      >
        <Masthead observedAt={observedAt} />
        <main id="main-content">{children}</main>
        <PageFooter pollCadence={POLL_CADENCE} />
      </div>
    </div>
  );
}
