import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { cache } from "react";
import * as schema from "./schema";

export const getDb = cache(async () => {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  return drizzle(
    createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }),
    { schema },
  );
});
