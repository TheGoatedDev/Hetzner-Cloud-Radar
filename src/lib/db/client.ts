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
    // Railway serverless sleeps only with zero outbound for 10m.
    // postgres.js defaults: idle_timeout=null (never drop) + keep_alive=60s TCP probes.
    globalThis.__hetznerCloudRadarSql = postgres(getConnectionString(), {
      max: 2,
      prepare: false,
      // Drop idle sockets so the service can sleep between traffic.
      idle_timeout: 20,
      // ponytail: no TCP keepalive; reconnect on next query if PG slept too
      keep_alive: 0,
    });
  }

  return globalThis.__hetznerCloudRadarSql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
