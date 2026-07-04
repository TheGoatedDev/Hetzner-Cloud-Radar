import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseEnv } from "@/env";
import * as schema from "./schema";

declare global {
  var __hetznerCloudRadarSql: postgres.Sql | undefined;
}

function getConnectionString() {
  return getDatabaseEnv().DATABASE_URL;
}

export function getSql() {
  if (!globalThis.__hetznerCloudRadarSql) {
    globalThis.__hetznerCloudRadarSql = postgres(getConnectionString(), {
      max: 5,
      prepare: false,
    });
  }

  return globalThis.__hetznerCloudRadarSql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
