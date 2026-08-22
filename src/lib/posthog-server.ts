import { PostHog } from "posthog-node";

export async function captureServer(
  event: string,
  properties?: Record<string, unknown>,
) {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return;

  // Direct EU API — server skip reverse proxy (no adblock)
  const ph = new PostHog(token, {
    host: "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    ph.capture({
      distinctId: "server",
      event,
      properties: { ...properties, $lib: "posthog-node" },
    });
    await ph.shutdown();
  } catch {
    // never break product paths
  }
}
