// Runtime migrator — no drizzle-kit. Used by Railway preDeploy.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

let host = "unknown";
try {
  host = new URL(url).host;
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}

const maxAttempts = 5;
const retryDelayMs = 3_000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const client = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 20,
  });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations applied");
    process.exitCode = 0;
    await client.end({ timeout: 5 });
    break;
  } catch (error) {
    await client.end({ timeout: 5 }).catch(() => {});
    const cause = error?.cause ?? error;
    const code = cause?.code ?? error?.code ?? "unknown";
    console.error(
      `Migration attempt ${attempt}/${maxAttempts} failed (${code}) connecting to ${host}`,
    );

    if (attempt === maxAttempts) {
      console.error("Migration failed:", error);
      console.error(
        "Check DATABASE_URL host is reachable from this service (Railway private DNS only works inside the project).",
      );
      process.exitCode = 1;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}
