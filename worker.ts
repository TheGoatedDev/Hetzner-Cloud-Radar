try {
  const { config } = await import("dotenv");
  config({ path: ".env.local", quiet: true });
  config({ quiet: true });
} catch {
  // prod: platform injects env; dotenv is a devDependency
}

const { pollAvailability } = await import("./src/lib/availability/poll");
const { getSql } = await import("./src/lib/db/client");

const result = await pollAvailability();
console.log(JSON.stringify(result, null, 2));

// Drain pool so fire-and-forget prune can finish before exit.
await getSql().end({ timeout: 5 });

process.exitCode = result.status === "success" ? 0 : 1;

export {};
