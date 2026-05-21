import { getAvailabilityHistory, isValidDc } from "@/lib/availability/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const dc = url.searchParams.get("dc");

  if (!type || !dc) {
    return Response.json(
      { error: "type and dc query params required" },
      { status: 400 },
    );
  }
  if (!/^[A-Z]{2,4}\d{1,3}$/.test(type)) {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }
  if (!isValidDc(dc)) {
    return Response.json({ error: "invalid dc" }, { status: 400 });
  }

  try {
    const history = await getAvailabilityHistory(type, dc);

    return Response.json(history, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    console.error("availability history failed", error);

    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
