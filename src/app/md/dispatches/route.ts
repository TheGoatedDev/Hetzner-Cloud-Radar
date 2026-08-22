import {
  formatObservedAt,
  getDispatchEvents,
  getLatestPollAt,
} from "@/lib/availability/read-model";
import { renderDispatchesMd } from "@/lib/markdown/pages";
import { markdownResponse } from "@/lib/markdown/response";

export const runtime = "nodejs";
export const revalidate = 300;

const WINDOW_DAYS = 60;
const LIMIT = 200;

export async function GET() {
  const latestAt = await getLatestPollAt();
  const events = latestAt
    ? await getDispatchEvents(latestAt, LIMIT, WINDOW_DAYS)
    : [];
  const observedAt = latestAt
    ? formatObservedAt(latestAt)
    : "awaiting first poll";

  return markdownResponse(renderDispatchesMd(events, observedAt, WINDOW_DAYS));
}
