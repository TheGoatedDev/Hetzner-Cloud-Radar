import { getAvailabilityReadModel } from "@/lib/availability/read-model";

export const runtime = "nodejs";
// Keep in sync with POLL_INTERVAL_SECONDS in cadence.ts
export const revalidate = 300;

export async function GET() {
  const data = await getAvailabilityReadModel();

  return Response.json(data);
}
