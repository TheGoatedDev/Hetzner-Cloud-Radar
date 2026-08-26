import { syncMarketListings } from "@/lib/market/sync";
import { captureServer } from "@/lib/posthog-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await syncMarketListings();
    await captureServer("market_sync_completed", {
      duration_ms: Date.now() - started,
      reddit_upserted: result.reddit.upserted,
      reddit_skipped: result.reddit.skipped,
      forum_upserted: result.forum.upserted,
      forum_skipped: result.forum.skipped,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync failed";
    await captureServer("market_sync_failed", {
      duration_ms: Date.now() - started,
      error: message,
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
