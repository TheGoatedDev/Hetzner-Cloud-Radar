import path from "node:path";
import type { NextConfig } from "next";

// Keep in sync with POLL_INTERVAL_SECONDS in src/lib/availability/cadence.ts
// (web image has no src/; next.config must stay self-contained)
const POLL_INTERVAL_SECONDS = 300;
const PUBLIC_READ_CACHE = `public, max-age=${POLL_INTERVAL_SECONDS}, stale-while-revalidate=${POLL_INTERVAL_SECONDS * 3}, stale-if-error=86400`;
// Parent ~/pnpm-workspace.yaml fools lockfile root detection; pin to this app.
const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: PUBLIC_READ_CACHE,
          },
        ],
      },
      {
        source: "/api/availability",
        headers: [
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: PUBLIC_READ_CACHE,
          },
        ],
      },
      {
        source: "/dispatches",
        headers: [
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: PUBLIC_READ_CACHE,
          },
        ],
      },
      {
        source: "/feed.atom",
        headers: [
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: PUBLIC_READ_CACHE,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
