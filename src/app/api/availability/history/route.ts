import { getAvailabilityHistory, isValidDc } from "@/lib/availability/history";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type")?.toUpperCase();
  const dc = url.searchParams.get("dc")?.toUpperCase();

  if (!type || !dc) {
    return Response.json(
      { error: "type and dc query params required" },
      { status: 400 },
    );
  }
  if (!/^[A-Z]+\d+$/u.test(type) || type.length > 16) {
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
