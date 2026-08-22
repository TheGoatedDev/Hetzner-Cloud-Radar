import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Keep in sync with POLL_INTERVAL_SECONDS in src/lib/availability/cadence.ts
const POLL_INTERVAL_SECONDS = 300;
const PUBLIC_READ_CACHE = `public, max-age=${POLL_INTERVAL_SECONDS}, stale-while-revalidate=${POLL_INTERVAL_SECONDS * 3}, stale-if-error=86400`;

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  // ponytail: reactCompiler bloats Worker past free 3MiB gzip
  reactCompiler: false,
  async rewrites() {
    const md = (source: string, destination: string) => ({
      source,
      destination,
      has: [
        {
          type: "header" as const,
          key: "accept",
          value: "(.*)text/markdown(.*)",
        },
      ],
    });
    return [
      md("/", "/md"),
      md("/methodology", "/md/methodology"),
      md("/dispatches", "/md/dispatches"),
    ];
  },
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
      {
        source: "/md",
        headers: [
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: PUBLIC_READ_CACHE,
          },
        ],
      },
      {
        source: "/md/:path*",
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
