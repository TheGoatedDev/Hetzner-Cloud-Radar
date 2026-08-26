import { listActiveListings } from "@/lib/market/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serverType = url.searchParams.get("type")?.toUpperCase() || undefined;
  const locationCode = url.searchParams.get("dc")?.toUpperCase() || undefined;
  const listings = await listActiveListings({ serverType, locationCode });
  return Response.json({ listings });
}
