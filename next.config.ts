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
  // PostHog API uses trailing slashes (/e/); local rewrites need this
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/hcr-relay/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/hcr-relay/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/hcr-relay/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  async headers() {
    const cdn = {
      key: "Cloudflare-CDN-Cache-Control",
      value: PUBLIC_READ_CACHE,
    };
    // Vary Accept so CF edge doesn't mix HTML/MD for same URL
    const varyAccept = { key: "Vary", value: "Accept" };
    return [
      { source: "/", headers: [cdn, varyAccept] },
      { source: "/methodology", headers: [cdn, varyAccept] },
      { source: "/dispatches", headers: [cdn, varyAccept] },
      { source: "/api/availability", headers: [cdn] },
      { source: "/feed.atom", headers: [cdn] },
      { source: "/md", headers: [cdn] },
      { source: "/md/:path*", headers: [cdn] },
    ];
  },
};

export default nextConfig;
