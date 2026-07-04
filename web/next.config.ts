import type { NextConfig } from "next";

const PUBLIC_READ_CACHE =
  "public, max-age=60, stale-while-revalidate=300, stale-if-error=86400";

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
