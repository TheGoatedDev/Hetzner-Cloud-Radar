import { getAvailabilityReadModel } from "@/lib/availability/read-model";

export const runtime = "nodejs";
// Keep in sync with POLL_INTERVAL_SECONDS in cadence.ts
export const revalidate = 300;

export async function GET() {
  const data = await getAvailabilityReadModel();

  // Never pin an empty/error payload in ISR or CDN — next hit should retry DB.
  if (data.usingFallback) {
    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
      },
    });
  }

  return Response.json(data);
}
