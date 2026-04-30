import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: {
    position: "top-right",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Scope camera to our own origin (needed for /scan) and explicitly
          // deny other powerful features we don't use. Without this, an
          // iframe embed of Stowage could request camera on behalf of the
          // page.
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    // When NEXT_PUBLIC_POCKETBASE_URL is set to a relative path (e.g. `/pb`)
    // we proxy /pb/* to the real PocketBase instance. This lets the browser
    // talk to PB over the same origin — required when running `next dev
    // --experimental-https` on a phone, where http://127.0.0.1:8090 would
    // be blocked as mixed content.
    //
    // Guarded to development only: if this ran in a production deployment
    // where NEXT_PUBLIC_POCKETBASE_URL is a relative path, every request
    // under that prefix would be silently forwarded to PB — bypassing the
    // Next route guards. Require NODE_ENV=development to be safe.
    if (process.env.NODE_ENV !== "development") return [];
    const publicUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "";
    if (!publicUrl.startsWith("/")) return [];
    const target = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090";
    const prefix = publicUrl.replace(/\/+$/, "");
    if (!prefix) return [];
    return [
      {
        source: `${prefix}/:path*`,
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
