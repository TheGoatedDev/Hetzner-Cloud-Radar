import { getListing } from "@/lib/market/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const listing = await getListing(id);
  if (!listing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ listing });
}
