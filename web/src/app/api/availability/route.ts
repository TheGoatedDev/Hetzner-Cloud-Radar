import { getAvailabilityReadModel } from "@/lib/availability/read-model";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const data = await getAvailabilityReadModel();

  return Response.json(data);
}
