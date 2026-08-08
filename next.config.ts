import type { NextConfig } from "next";
import { POLL_INTERVAL_SECONDS } from "./src/lib/availability/cadence";

const PUBLIC_READ_CACHE = `public, max-age=${POLL_INTERVAL_SECONDS}, stale-while-revalidate=${POLL_INTERVAL_SECONDS * 3}, stale-if-error=86400`;

const nextConfig: NextConfig = {
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
