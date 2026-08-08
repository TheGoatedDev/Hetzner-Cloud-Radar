import { config } from "dotenv";
import { pollAvailability } from "./src/lib/availability/poll";
import { getSql } from "./src/lib/db/client";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function warmPublicReads(appUrl: string) {
  const origin = appUrl.replace(/\/$/, "");
  const results = await Promise.allSettled(
    ["/", "/api/availability"].map((path) =>
      fetch(`${origin}${path}`, {
        headers: {
          "cache-control": "no-cache",
          pragma: "no-cache",
          "x-cache-warm": "worker",
        },
      }),
    ),
  );

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.warn(
        `Cache warm failed for ${index === 0 ? "/" : "/api/availability"}`,
        result.reason,
      );
    }
  }
}

async function main() {
  const result = await pollAvailability();
  console.log(JSON.stringify(result, null, 2));

  const appUrl = process.env.APP_URL;
  if (result.status === "success" && appUrl) {
    await warmPublicReads(appUrl);
  }

  await getSql().end({ timeout: 5 });

  process.exitCode = result.status === "success" ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
