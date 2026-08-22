import { POLL_INTERVAL_SECONDS } from "@/lib/availability/cadence";

export const PUBLIC_READ_CACHE = `public, max-age=${POLL_INTERVAL_SECONDS}, stale-while-revalidate=${POLL_INTERVAL_SECONDS * 3}, stale-if-error=86400`;

// ponytail: chars/4 token estimate; real tokenizer if agents need accuracy
export function markdownResponse(md: string) {
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "x-markdown-tokens": String(Math.ceil(md.length / 4)),
      "Cloudflare-CDN-Cache-Control": PUBLIC_READ_CACHE,
    },
  });
}
