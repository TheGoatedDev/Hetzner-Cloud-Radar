// Custom entry: OpenNext fetch + cron scheduled → internal poll route.
// `.open-next/worker.js` is produced by `opennextjs-cloudflare build`.
// @ts-nocheck
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch: handler.fetch,

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
