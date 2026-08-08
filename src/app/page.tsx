import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { unstable_noStore as noStore } from "next/cache";
import {
  AVAILABILITY_QUERY_KEY,
  createAvailabilityQueryClient,
} from "@/lib/availability/query";
import { getAvailabilityReadModel } from "@/lib/availability/read-model";
import { RadarView } from "./_components/radar-view";

export const runtime = "nodejs";
// Keep in sync with POLL_INTERVAL_SECONDS in cadence.ts
export const revalidate = 300;

export default async function Home() {
  const data = await getAvailabilityReadModel();

  // Don't ISR-cache the empty fallback from a cold/error read.
  if (data.usingFallback) {
    noStore();
  }

  const queryClient = createAvailabilityQueryClient();
  queryClient.setQueryData(AVAILABILITY_QUERY_KEY, data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RadarView />
    </HydrationBoundary>
  );
}
