import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getListing, updateListingStatus } from "@/lib/market/listings";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["sold", "removed", "active"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await getSession();
  const listing = await getListing(id, session?.user.id);
  if (!listing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ listing });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateListingStatus(
    id,
    session.user.id,
    parsed.data.status,
  );
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ id: updated });
}
