import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const TABLES = [
  "server_types",
  "locations",
  "availability_current",
  "daily_availability_state",
  "stock_events",
  "poll_runs",
  "marketing_dispatch_sends",
];

const SKIP = new Set([
  "d1_migrations",
  "sqlite_sequence",
  "sqlite_schema",
  "sqlite_stat1",
]);

const CHUNK = 250;

function parseArgs(argv) {
  const args = { dryRun: false, force: false, dump: null, selfTest: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--self-test") args.selfTest = true;
    else if (a === "--dump") args.dump = argv[++i];
    else throw new Error(`unknown arg: ${a}`);
  }
  return args;
}

function splitSqlStatements(sql) {
  const out = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      cur += c;
      if (c === quote && sql[i + 1] === quote) {
        cur += sql[++i];
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      cur += c;
      continue;
    }
    if (c === "-" && sql[i + 1] === "-") {
      i += 2;
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (c === ";") {
      const stmt = cur.trim();
      if (stmt) out.push(stmt);
      cur = "";
      continue;
    }
    cur += c;
  }
  const tail = cur.trim();
  if (tail) out.push(tail);
  return out;
}

function tableFromInsert(stmt) {
  return (
    stmt.match(/^INSERT\s+(?:OR\s+\w+\s+)?INTO\s+["'`]?(\w+)["'`]?/i)?.[1] ??
    null
  );
}

function exportD1() {
  const output = join(mkdtempSync(join(tmpdir(), "d1-export-")), "d1.sql");
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "d1",
      "export",
      "hetzner-cloud-radar",
      "--remote",
      `--output=${output}`,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error("wrangler d1 export failed");
  return output;
}

async function countTable(client, table) {
  const rs = await client.execute(`SELECT COUNT(*) AS c FROM "${table}"`);
  return Number(rs.rows[0].c);
}

function selfTest() {
  const stmts = splitSqlStatements(`INSERT INTO poll_runs VALUES ('a;b');
-- comment
INSERT INTO "server_types" VALUES (1);`);
  if (stmts.length !== 2)
    throw new Error(`split: expected 2 got ${stmts.length}`);
  if (tableFromInsert(stmts[0]) !== "poll_runs") throw new Error("table parse");
  if (tableFromInsert(stmts[1]) !== "server_types")
    throw new Error("quoted table");
  console.log("self-test ok");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.selfTest) {
    selfTest();
    return;
  }
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");

  const dumpPath = args.dump ?? exportD1();
  const statements = splitSqlStatements(readFileSync(dumpPath, "utf8"));
  const inserts = [];
  const dumpCounts = Object.fromEntries(TABLES.map((t) => [t, 0]));

  for (const stmt of statements) {
    if (!/^INSERT\s+/i.test(stmt)) continue;
    const table = tableFromInsert(stmt);
    if (!table || SKIP.has(table) || !TABLES.includes(table)) continue;
    inserts.push({ table, stmt: `${stmt};` });
    dumpCounts[table] += 1;
  }

  console.log("dump inserts:", dumpCounts);
  if (args.dryRun) return;

  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  for (const table of TABLES) {
    try {
      await countTable(client, table);
    } catch {
      throw new Error(`${table} missing — run pnpm db:migrate first`);
    }
  }

  const live = Object.fromEntries(
    await Promise.all(
      TABLES.map(async (t) => [t, await countTable(client, t)]),
    ),
  );
  const nonempty = TABLES.filter((t) => live[t] > 0);
  if (nonempty.length && !args.force) {
    throw new Error(
      `Turso not empty (${JSON.stringify(live)}). Pass --force to truncate.`,
    );
  }

  if (args.force) {
    await client.execute("PRAGMA foreign_keys = OFF");
    for (const table of [...TABLES].reverse()) {
      await client.execute(`DELETE FROM "${table}"`);
    }
  }

  await client.execute("PRAGMA foreign_keys = OFF");
  const byTable = new Map(TABLES.map((t) => [t, []]));
  for (const row of inserts) byTable.get(row.table).push(row.stmt);
  for (const table of TABLES) {
    const stmts = byTable.get(table);
    for (let i = 0; i < stmts.length; i += CHUNK) {
      await client.batch(
        stmts.slice(i, i + CHUNK).map((sql) => ({ sql })),
        "write",
      );
    }
  }
  await client.execute("PRAGMA foreign_keys = ON");

  const after = Object.fromEntries(
    await Promise.all(
      TABLES.map(async (t) => [t, await countTable(client, t)]),
    ),
  );
  console.log("turso counts:", after);

  const mismatch = TABLES.filter((t) => after[t] !== dumpCounts[t]);
  if (mismatch.length) {
    throw new Error(
      `count mismatch: ${mismatch.map((t) => `${t} dump=${dumpCounts[t]} turso=${after[t]}`).join(", ")}`,
    );
  }

  const observed = await client.execute(
    "SELECT MAX(observed_at) AS m FROM availability_current",
  );
  const events = await client.execute(
    "SELECT MAX(observed_at) AS m FROM stock_events",
  );
  console.log("availability_current.max(observed_at)", observed.rows[0].m);
  console.log("stock_events.max(observed_at)", events.rows[0].m);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
