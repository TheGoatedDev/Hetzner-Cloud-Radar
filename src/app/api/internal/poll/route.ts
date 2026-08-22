import { getHetznerEnv } from "@/env";
import { pollAvailability } from "@/lib/availability/poll";
import { captureServer } from "@/lib/posthog-server";

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

  const started = Date.now();
  try {
    const result = await pollAvailability();
    const origin = new URL(req.url).origin;
    await Promise.allSettled(
      ["/", "/api/availability"].map((p) =>
        fetch(`${origin}${p}`, { cache: "no-store" }).catch(() => null),
      ),
    );

    if (result.status === "success") {
      await captureServer("availability_poll_completed", {
        duration_ms: Date.now() - started,
        inserted_observations: result.insertedObservations,
        current_updated: result.currentUpdated,
        unknown_families: result.unknownFamilies.length,
        attempted_dispatches: result.emailDispatches.attemptedDispatches,
        sent_dispatches: result.emailDispatches.sentDispatches,
      });
    } else {
      await captureServer("availability_poll_failed", {
        duration_ms: Date.now() - started,
        error: result.error,
      });
    }

    return Response.json(result);
  } catch (error) {
    await captureServer("availability_poll_failed", {
      duration_ms: Date.now() - started,
      error: error instanceof Error ? error.message : "poll threw",
    });
    throw error;
  }
}
