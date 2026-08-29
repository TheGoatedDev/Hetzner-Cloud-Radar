import type { PropsWithChildren } from "react";
import { POLL_CADENCE } from "@/lib/availability/read-model";
import { Masthead } from "./sections/masthead";
import { PageFooter } from "./sections/page-footer";

export function PageFrame({
    children,
    observedAt,
}: PropsWithChildren<{
    observedAt: string;
    /** @deprecated same width as home; kept so callers don't break */
    wide?: boolean;
}>) {
    // outer w-full: body is flex-col; mx-auto alone shrinks shell to content width
    // max-w-5xl matches RadarView / home
    return (
        <div className="flex w-full flex-1 flex-col">
            <div className="page-shell mx-auto flex w-full max-w-5xl flex-1 flex-col">
                <Masthead observedAt={observedAt} />
                <main id="main-content" className="w-full">
                    {children}
                </main>
                <PageFooter pollCadence={POLL_CADENCE} />
            </div>
        </div>
    );
}
