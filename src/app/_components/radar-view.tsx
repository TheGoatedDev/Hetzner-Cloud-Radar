"use client";

import { useQuery } from "@tanstack/react-query";
import { AVAILABILITY_QUERY_KEY } from "@/lib/availability/query";
import type { AvailabilityReadModel } from "@/lib/availability/read-model";
import { DCS, type Stock } from "@/lib/schema";
import { Dispatches } from "./sections/dispatches";
import { FamilySection } from "./sections/family-section";
import { Legend } from "./sections/legend";
import { Masthead } from "./sections/masthead";
import { PageFooter } from "./sections/page-footer";
import { RightNow } from "./sections/right-now";
import { Subscribe } from "./sections/subscribe";
import { SupplyTrend } from "./sections/supply-trend";

async function fetchAvailability() {
  const response = await fetch("/api/availability", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Availability request failed: HTTP ${response.status}`);
  }

  return (await response.json()) as AvailabilityReadModel;
}

function tally(allCells: Stock[]) {
  return {
    tracked: allCells.length,
    available: allCells.filter((s) => s === "available").length,
    limited: allCells.filter((s) => s === "limited").length,
    soldOut: allCells.filter((s) => s === "sold-out").length,
    notOffered: allCells.filter((s) => s === "not-offered").length,
  };
}

export function RadarView() {
  const { data } = useQuery({
    queryKey: AVAILABILITY_QUERY_KEY,
    queryFn: fetchAvailability,
    refetchInterval: 60_000,
  });

  if (!data) {
    return null;
  }

  const allCells = data.families.flatMap((f) =>
    f.types.flatMap((t) => DCS.map((dc) => t.stock[dc])),
  );
  const totals = tally(allCells);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pt-10 pb-20 sm:px-10 sm:pt-16">
      <Masthead observedAt={data.observedAt} />
      <RightNow
        totals={totals}
        topLine={data.topLine}
        observedAt={data.observedAt}
      />
      <SupplyTrend days={data.supplyHistory} />
      <Legend />
      {data.families.map((f, i) => (
        <FamilySection key={f.id} family={f} first={i === 0} />
      ))}
      <Subscribe />
      <Dispatches events={data.events} />
      <PageFooter pollCadence={data.pollCadence} />
    </div>
  );
}
