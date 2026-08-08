import { config } from "dotenv";
import { pollAvailability } from "./src/lib/availability/poll";
import { getSql } from "./src/lib/db/client";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const result = await pollAvailability();
  console.log(JSON.stringify(result, null, 2));

  // Drain pool so fire-and-forget prune can finish before exit.
  await getSql().end({ timeout: 5 });

  process.exitCode = result.status === "success" ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
