import { getAvailabilityReadModel } from "@/lib/availability/read-model";
import { renderHomeMd } from "@/lib/markdown/pages";
import { markdownResponse } from "@/lib/markdown/response";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  const data = await getAvailabilityReadModel();
  return markdownResponse(renderHomeMd(data));
}
