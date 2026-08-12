import { getHetznerEnv } from "@/env";
import { pollAvailability } from "@/lib/availability/poll";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    getHetznerEnv();
  } catch {
    return Response.json(
      { error: "missing HETZNER_API_TOKEN" },
      { status: 500 },
    );
  }
  const result = await pollAvailability();
  const origin = new URL(req.url).origin;
  await Promise.allSettled(
    ["/", "/api/availability"].map((p) =>
      fetch(`${origin}${p}`, { cache: "no-store" }).catch(() => null),
    ),
  );
  return Response.json(result);
}
