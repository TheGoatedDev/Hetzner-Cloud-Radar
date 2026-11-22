import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { formatObservedAt } from "@/lib/availability/read-model";
import {
    getServerCodes,
    getServerDetail,
    type ServerDetail,
} from "@/lib/availability/server-detail";
import { DC_META, DCS, STOCK } from "@/lib/schema";
import { PageFrame } from "../../_components/page-frame";
import { SectionHeader } from "../../_components/section-header";
import { StockGlyph } from "../../_components/stock-glyph";
import { AvailabilityCalendar } from "./_components/availability-calendar";

// Keep in sync with POLL_INTERVAL_SECONDS in cadence.ts
export const revalidate = 1200;

export async function generateStaticParams() {
    return (await getServerCodes()).map((code) => ({
        code: code.toLowerCase(),
    }));
}

function specLine(detail: ServerDetail) {
    return `${detail.cores} vCPU · ${detail.memoryGb} GB RAM · ${detail.diskGb} GB disk`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ code: string }>;
}): Promise<Metadata> {
    const { code } = await params;
    const detail = await getServerDetail(code).catch(() => null);
    if (!detail) return { title: "Server not found" };

    return {
        title: `${detail.code} availability`,
        description: `${detail.code} (${detail.family.label} ${detail.family.kicker}, ${specLine(detail)}) stock per Hetzner Cloud datacentre, with 60 days of history.`,
        alternates: { canonical: `/servers/${detail.code.toLowerCase()}` },
    };
}

function titleCase(value: string | null) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "—";
}

function formatDay(iso: string | null) {
    return iso ? iso.slice(0, 10) : "—";
}

function Section({
    title,
    kicker,
    blurb,
    children,
}: {
    title: string;
    kicker: string;
    blurb?: string;
    children: ReactNode;
}) {
    return (
        <section className="flex flex-col gap-4 pt-12">
            <SectionHeader kicker={kicker} title={title} blurb={blurb} />
            {children}
        </section>
    );
}

function Specs({ detail }: { detail: ServerDetail }) {
    const rows: [string, ReactNode][] = [
        ["vCPU", detail.cores],
        ["Memory", `${detail.memoryGb} GB`],
        ["Disk", `${detail.diskGb} GB`],
        ["Architecture", detail.architecture],
        ["CPU", titleCase(detail.details.cpuType)],
        ["Storage", titleCase(detail.details.storageType)],
        ["Family", `${detail.family.label} · ${detail.family.kicker}`],
    ];

    return (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {rows.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                    <dt className="text-xs text-ink-faint">{label}</dt>
                    <dd className="text-sm text-ink tabular-nums">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function Datacentres({ detail }: { detail: ServerDetail }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm tabular-nums">
                <caption className="sr-only">
                    {detail.code} status and price per datacentre
                </caption>
                <thead>
                    <tr className="text-xs text-ink-faint">
                        <th
                            scope="col"
                            className="px-2 py-2 text-left font-medium"
                        >
                            Datacentre
                        </th>
                        <th
                            scope="col"
                            className="px-2 py-2 text-left font-medium"
                        >
                            Status
                        </th>
                        <th
                            scope="col"
                            className="px-2 py-2 text-right font-medium"
                        >
                            €/month
                        </th>
                        <th
                            scope="col"
                            className="hidden px-2 py-2 text-right font-medium sm:table-cell"
                        >
                            €/hour
                        </th>
                        <th
                            scope="col"
                            className="hidden px-2 py-2 text-right font-medium sm:table-cell"
                        >
                            Traffic
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {DCS.map((dc, i) => {
                        const { stock } = detail.current[dc];
                        const price = detail.details.prices[dc];
                        return (
                            <tr
                                key={dc}
                                className={
                                    i > 0 ? "border-t border-hairline" : ""
                                }
                            >
                                <th
                                    scope="row"
                                    className="px-2 py-2 text-left font-medium text-ink"
                                >
                                    <span className="tracking-[0.08em]">
                                        {dc}
                                    </span>
                                    <span className="block text-xs font-normal text-ink-faint">
                                        {DC_META[dc].city},{" "}
                                        {DC_META[dc].country}
                                    </span>
                                </th>
                                <td className="px-2 py-2">
                                    <span className="inline-flex items-baseline gap-2">
                                        <StockGlyph stock={stock} />
                                        <span
                                            className={STOCK[stock].textClass}
                                        >
                                            {STOCK[stock].label}
                                        </span>
                                    </span>
                                </td>
                                <td className="px-2 py-2 text-right text-ink">
                                    {price?.monthly ?? "—"}
                                </td>
                                <td className="hidden px-2 py-2 text-right text-ink-soft sm:table-cell">
                                    {price?.hourly ?? "—"}
                                </td>
                                <td className="hidden px-2 py-2 text-right text-ink-soft sm:table-cell">
                                    {price?.includedTrafficTb
                                        ? `${price.includedTrafficTb} TB`
                                        : "—"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default async function ServerPage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;
    const detail = await getServerDetail(code);
    if (!detail) notFound();

    const { deprecation } = detail.details;

    return (
        <PageFrame
            observedAt={
                detail.latestPollAt
                    ? formatObservedAt(detail.latestPollAt)
                    : "awaiting first poll"
            }
        >
            <section className="flex flex-col gap-6 pt-10">
                <SectionHeader
                    as="h1"
                    kicker={`${detail.family.label} · ${detail.family.kicker}`}
                    title={detail.code}
                    blurb={`${specLine(detail)}. Stock and price per Hetzner Cloud datacentre, with 60 days of observed history.`}
                />
                {deprecation ? (
                    <p
                        role="note"
                        className="border-l-2 border-accent pl-3 font-sans text-base text-ink"
                    >
                        Hetzner has deprecated {detail.code}
                        {deprecation.announced
                            ? ` (announced ${formatDay(deprecation.announced)})`
                            : ""}
                        .
                        {deprecation.unavailableAfter
                            ? ` It can no longer be ordered after ${formatDay(deprecation.unavailableAfter)}.`
                            : ""}
                    </p>
                ) : null}
                <Specs detail={detail} />
            </section>

            <Section
                kicker="Right now"
                title="Datacentres"
                blurb="Current stock and gross list price in each datacentre. Prices come from the Hetzner Cloud API and include VAT at Hetzner's default rate."
            >
                <Datacentres detail={detail} />
            </Section>

            <Section
                kicker="Last 60 days"
                title="Daily availability"
                blurb="One cell per UTC day in each datacentre, from every poll that day."
            >
                <AvailabilityCalendar rows={detail.calendar} />
            </Section>
        </PageFrame>
    );
}
