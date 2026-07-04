import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const pollUrl =
  process.env.POLL_URL ?? "http://127.0.0.1:3000/api/cron/poll-availability";
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
  throw new Error("CRON_SECRET is required");
}

const response = await fetch(pollUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    Accept: "application/json",
  },
});
const body = await response.text();

console.log(`${response.status} ${response.statusText}`);

try {
  console.log(JSON.stringify(JSON.parse(body), null, 2));
} catch {
  console.log(body);
}

if (!response.ok) {
  process.exitCode = 1;
}
