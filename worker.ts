// Local one-shot only works under wrangler/OpenNext (D1 binding).
// Prefer: curl -X POST .../api/internal/poll -H "Authorization: Bearer $CRON_SECRET"
import { pollAvailability } from "./src/lib/availability/poll";

async function main() {
  const result = await pollAvailability();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "success" ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
