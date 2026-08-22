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
  return (
    <div
      className={`mx-auto flex w-full ${wide ? "max-w-5xl" : "max-w-3xl"} flex-1 flex-col px-6 py-6 sm:px-10`}
    >
      <Masthead observedAt={observedAt} />
      <main id="main-content">{children}</main>
      <PageFooter pollCadence={POLL_CADENCE} />
    </div>
  );
}
