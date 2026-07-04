import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  AVAILABILITY_QUERY_KEY,
  createAvailabilityQueryClient,
} from "@/lib/availability/query";
import { getAvailabilityReadModel } from "@/lib/availability/read-model";
import { RadarView } from "./_components/radar-view";

export const runtime = "nodejs";
export const revalidate = 60;

export default async function Home() {
  const queryClient = createAvailabilityQueryClient();

  await queryClient.prefetchQuery({
    queryKey: AVAILABILITY_QUERY_KEY,
    queryFn: getAvailabilityReadModel,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RadarView />
    </HydrationBoundary>
  );
}
