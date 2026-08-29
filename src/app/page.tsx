import { unstable_noStore as noStore } from "next/cache";
import { getAvailabilityReadModel } from "@/lib/availability/read-model";
import { RadarView } from "./_components/radar-view";

export const runtime = "edge";
export const revalidate = 300;

export default async function Home() {
  const data = await getAvailabilityReadModel();

  if (data.usingFallback) {
    noStore();
  }

  return <RadarView data={data} />;
}
