import { PostHog } from "posthog-node";

export async function captureServer(
  event: string,
  properties?: Record<string, unknown>,
) {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !host) return;

  const ph = new PostHog(token, {
    host,
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
