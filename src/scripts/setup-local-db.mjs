import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://postgres:password@localhost:5432/hetzner_cloud_radar";
const targetUrl = new URL(databaseUrl);
const databaseName = targetUrl.pathname.replace(/^\//, "");

if (!databaseName) {
  throw new Error("DATABASE_URL must include a database name");
}

const adminUrl = new URL(databaseUrl);
adminUrl.pathname = "/postgres";

const sql = postgres(adminUrl.toString(), {
  max: 1,
  prepare: false,
});

try {
  const existing = await sql`
    select 1
    from pg_database
    where datname = ${databaseName}
  `;

  if (existing.length === 0) {
    await sql`create database ${sql(databaseName)}`;
    console.log(`Created database ${databaseName}`);
  } else {
    console.log(`Database ${databaseName} already exists`);
  }
} catch (error) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "28P01"
  ) {
    throw new Error(
      `Postgres rejected DATABASE_URL credentials for ${targetUrl.username || "current user"} at ${targetUrl.hostname}:${targetUrl.port || "5432"}. Update DATABASE_URL in .env.local with your local Postgres user/password.`,
    );
  }

  throw error;
} finally {
  await sql.end();
}
