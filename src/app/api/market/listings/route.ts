import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  createListing,
  isValidDc,
  listActiveListings,
  listMyListings,
} from "@/lib/market/listings";

export const runtime = "nodejs";

const createSchema = z.object({
  serverType: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9]+$/),
  locationCode: z.string().trim().min(2).max(8),
  priceEuros: z.number().int().min(1).max(100_000),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().max(4000).optional(),
  includes: z.string().trim().max(500).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const serverType = url.searchParams.get("type") ?? undefined;
  const locationCode = url.searchParams.get("dc") ?? undefined;

  if (mine) {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Sign in required" }, { status: 401 });
    }
    const listings = await listMyListings(session.user.id);
    return Response.json({ listings });
  }

  const listings = await listActiveListings({ serverType, locationCode });
  return Response.json({ listings });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid listing" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (!isValidDc(data.locationCode.toUpperCase())) {
    return Response.json({ error: "Unknown datacentre" }, { status: 400 });
  }

  const id = await createListing({
    sellerId: session.user.id,
    serverType: data.serverType,
    locationCode: data.locationCode,
    priceCents: data.priceEuros * 100,
    title: data.title,
    body: data.body,
    includes: data.includes,
  });

  return Response.json({ id }, { status: 201 });
}
