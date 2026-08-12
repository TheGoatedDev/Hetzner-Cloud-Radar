import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "./schema";

// ponytail: request-scoped D1 client; never reuse pool across Workers requests

export const getDb = cache(async () => {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return drizzle(env.DB, { schema });
  } catch {
    throw new Error(
      "Cloudflare DB binding not available (use pnpm cf:preview or wrangler for D1)",
    );
  }
});
