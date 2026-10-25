import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Production shares the "use cache" store across every Node process on the host through a
  // SQLite file, so an admin edit refreshes all of them (DECISIONS.md 24). Dev keeps the default.
  cacheHandlers:
    process.env.NODE_ENV === "production" ? { default: path.resolve("cache-handler.mjs") } : undefined,
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
  // Product photos: demo photos in public/demo and uploads under /media. Sources are about
  // 1,000 px, so the largest sizes are left out; WebP only, because AVIF encoding is slow on
  // shared hosting CPUs. Resized copies are kept 31 days: a changed photo gets a new file name.
  images: {
    formats: ["image/webp"],
    qualities: [75],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    localPatterns: [
      { pathname: "/demo/**", search: "" },
      { pathname: "/media/**", search: "" },
    ],
    minimumCacheTTL: 2_678_400,
  },
  // Pages render per request from cached data (DECISIONS.md 23), so instant-navigation checks
  // run only where a segment opts in with `export const instant = true`.
  experimental: {
    instantInsights: { validationLevel: "manual-warning" },
    // Measured on 25 Oct 2026: inlining the stylesheet also copies it three more times into the
    // page's React payload (+150 KB raw per page), so it stays a separate, cacheable file.
    inlineCss: false,
    // After a restart the reused dev cache made every page reload itself in a loop (Next 16.4.3,
    // Windows; DECISIONS.md 48). Dev compiles from scratch each start; builds are unaffected.
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
