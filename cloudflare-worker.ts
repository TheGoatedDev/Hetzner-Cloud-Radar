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

function maybeMarkdownRequest(request) {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/markdown")) return request;
  const url = new URL(request.url);
  const dest = MD_PATHS[url.pathname];
  if (!dest) return request;
  url.pathname = dest;
  return new Request(url, request);
}

export default {
  fetch(request, env, ctx) {
    return handler.fetch(maybeMarkdownRequest(request), env, ctx);
  },

  async scheduled(_controller, env, ctx) {
    const secret = env.CRON_SECRET;
    const headers = new Headers({ "content-type": "application/json" });
    if (secret) headers.set("authorization", `Bearer ${secret}`);

    ctx.waitUntil(
      handler.fetch(
        new Request("http://localhost/api/internal/poll", {
          method: "POST",
          headers,
        }),
        env,
        ctx,
      ),
    );
  },
};

export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
