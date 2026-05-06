import { revalidatePath } from "next/cache";
import { getCronEnv } from "@/env";
import { pollAvailability } from "@/lib/availability/poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const authorization = request.headers.get("authorization");
  const secret = getCronEnv().CRON_SECRET;

  return authorization === `Bearer ${secret}`;
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
  }

  return Response.json(result, {
    status: result.status === "success" ? 200 : 500,
  });
}
