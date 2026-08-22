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
