import { getObservedAtLabel } from "@/lib/availability/read-model";
import { renderMethodologyMd } from "@/lib/markdown/pages";
import { markdownResponse } from "@/lib/markdown/response";

export const runtime = "edge";
export const revalidate = 300;

export async function GET() {
  return markdownResponse(renderMethodologyMd(await getObservedAtLabel()));
}
