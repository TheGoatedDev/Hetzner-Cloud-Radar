import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCronEnv } from "@/env";
import { pollAvailability } from "@/lib/availability/poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const authorization = request.headers.get("authorization");
  const secret = getCronEnv().CRON_SECRET;

  return authorization === `Bearer ${secret}`;
}

function schedulePublicReadCacheWarm(request: Request) {
  const origin = new URL(request.url).origin;

  after(async () => {
    // App Router revalidation is lazy and applies after the handler, so warm
    // public reads after cron responds instead of making the next reader pay.
    const results = await Promise.allSettled(
      ["/", "/api/availability"].map((path) =>
        fetch(new URL(path, origin), {
          headers: {
            "cache-control": "no-cache",
            pragma: "no-cache",
            "x-cache-warm": "poll-availability",
          },
        }),
      ),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        console.warn(
          `Cache warm failed for ${index === 0 ? "/" : "/api/availability"}`,
          result.reason,
        );
      }
    }
  });
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Environment validation failed";

    return Response.json({ error: message }, { status: 500 });
  }

  const result = await pollAvailability();

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/api/availability");
    schedulePublicReadCacheWarm(request);
  }

  return Response.json(result, {
    status: result.status === "success" ? 200 : 500,
  });
}
