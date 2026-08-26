// Custom entry: OpenNext fetch + cron scheduled → internal poll route.
// `.open-next/worker.js` is produced by `opennextjs-cloudflare build`.
// @ts-nocheck
import { default as handler } from "./.open-next/worker.js";

// OpenNext drops next.config rewrites `has: header`. Negotiate here instead.
const MD_PATHS = {
  "/": "/md",
  "/methodology": "/md/methodology",
  "/dispatches": "/md/dispatches",
};

// PostHog reverse proxy (same-origin path; avoid blocker-y names)
const PH_PREFIX = "/hcr-relay";
const PH_API = "eu.i.posthog.com";
const PH_ASSETS = "eu-assets.i.posthog.com";

function maybeMarkdownRequest(request) {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/markdown")) return request;
  const url = new URL(request.url);
  const dest = MD_PATHS[url.pathname];
  if (!dest) return request;
  url.pathname = dest;
  return new Request(url, request);
}

async function proxyPostHog(request, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname.slice(PH_PREFIX.length) || "/";
  const pathWithParams = pathname + url.search;

  if (pathname.startsWith("/static/") || pathname.startsWith("/array/")) {
    let response = await caches.default.match(request);
    if (!response) {
      response = await fetch(`https://${PH_ASSETS}${pathWithParams}`);
      ctx.waitUntil(caches.default.put(request, response.clone()));
    }
    return response;
  }

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.set("X-Forwarded-For", ip);

  return fetch(
    new Request(`https://${PH_API}${pathWithParams}`, {
      method: request.method,
      headers,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? await request.arrayBuffer()
          : null,
      redirect: request.redirect,
    }),
  );
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (
      url.pathname === PH_PREFIX ||
      url.pathname.startsWith(`${PH_PREFIX}/`)
    ) {
      return proxyPostHog(request, ctx);
    }
    return handler.fetch(maybeMarkdownRequest(request), env, ctx);
  },

  async scheduled(controller, env, ctx) {
    const secret = env.CRON_SECRET;
    const headers = new Headers({ "content-type": "application/json" });
    if (secret) headers.set("authorization", `Bearer ${secret}`);

    // Availability poll every trigger (*/5). Market sync once per hour.
    const minute = new Date(controller.scheduledTime).getUTCMinutes();
    const paths =
      minute === 0
        ? ["/api/internal/poll", "/api/internal/market-sync"]
        : ["/api/internal/poll"];

    for (const path of paths) {
      ctx.waitUntil(
        handler.fetch(
          new Request(`http://localhost${path}`, {
            method: "POST",
            headers,
          }),
          env,
          ctx,
        ),
      );
    }
  },
};

export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
