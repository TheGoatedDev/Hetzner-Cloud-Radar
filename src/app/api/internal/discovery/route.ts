import { getHetznerEnv } from "@/env";
import { discoverServerFamilies } from "@/lib/availability/discovery";
import { captureServer } from "@/lib/posthog-server";

export const maxDuration = 60;

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

    try {
        const result = await discoverServerFamilies();

        if (result.discovered.length > 0) {
            await captureServer("server_families_discovered", {
                families: result.discovered,
            });
            const origin = new URL(req.url).origin;
            await Promise.allSettled(
                ["/", "/api/availability"].map((p) =>
                    fetch(`${origin}${p}`, { cache: "no-store" }).catch(
                        () => null,
                    ),
                ),
            );
        }

        return Response.json(result);
    } catch (error) {
        await captureServer("server_family_discovery_failed", {
            error: error instanceof Error ? error.message : "discovery threw",
        });
        throw error;
    }
}

// Vercel Cron invokes with GET + `Authorization: Bearer $CRON_SECRET`.
export const GET = POST;
