import type { AvailabilityReadModel } from "@/lib/availability/read-model";
import { DCS, type Family, type Stock, type StockEvent } from "@/lib/schema";
import { DispatchList } from "./dispatch-list";
import { FamilyTable } from "./family-table";
import { SectionHeader } from "./section-header";
import { Legend } from "./sections/legend";
import { Masthead } from "./sections/masthead";
import { PageFooter } from "./sections/page-footer";
import { RightNow } from "./sections/right-now";
import { SupplyTrend } from "./sections/supply-trend";
import { SubscribeForm } from "./subscribe-form";

function tally(allCells: Stock[]) {
    return {
        tracked: allCells.length,
        available: allCells.filter((s) => s === "available").length,
        limited: allCells.filter((s) => s === "limited").length,
        soldOut: allCells.filter((s) => s === "sold-out").length,
        notOffered: allCells.filter((s) => s === "not-offered").length,
    };
}

function FamilyBlock({ family, first }: { family: Family; first: boolean }) {
    return (
        <section className={`flex flex-col gap-4 ${first ? "pt-10" : "pt-12"}`}>
            <SectionHeader
                kicker={family.kicker}
                title={family.label}
                blurb={family.blurb}
            />
            <FamilyTable family={family} />
        </section>
    );
}

function SubscribeBlock() {
    return (
        <section id="subscribe" className="flex flex-col gap-6 pt-16">
            <SectionHeader
                kicker="Mailing list"
                title="Subscribe to dispatches"
                blurb="One short email when a server type goes sold out or returns to stock."
            />
            <SubscribeForm />
        </section>
    );
}

function DispatchesBlock({ events }: { events: StockEvent[] }) {
    return (
        <section className="flex flex-col gap-4 pt-14">
            <SectionHeader
                kicker="Last 30 days"
                title="Recent dispatches"
                blurb="Notable stock-out, restock, and rollout events. Each dispatch is signed by the timestamp of its first observation."
            />
            <DispatchList
                events={events}
                emptyMessage="The wire has been quiet. No dispatches filed in the last thirty days."
            />
        </section>
    );
}

export function RadarView({ data }: { data: AvailabilityReadModel }) {
    const allCells = data.families.flatMap((f) =>
        f.types.flatMap((t) => DCS.map((dc) => t.stock[dc])),
    );
    const totals = tally(allCells);

    return (
        <div className="flex w-full flex-1 flex-col">
            <div className="page-shell mx-auto flex w-full max-w-5xl flex-1 flex-col">
                <Masthead observedAt={data.observedAt} />
                <main id="main-content" className="w-full">
                    <RightNow
                        totals={totals}
                        topLine={data.topLine}
                        observedAt={data.observedAt}
                    />
                    <SupplyTrend days={data.supplyHistory} />
                    <Legend />
                    {data.families.map((f, i) => (
                        <FamilyBlock key={f.id} family={f} first={i === 0} />
                    ))}
                    <SubscribeBlock />
                    <DispatchesBlock events={data.events} />
                </main>
                <PageFooter pollCadence={data.pollCadence} />
            </div>
        </div>
    );
}
