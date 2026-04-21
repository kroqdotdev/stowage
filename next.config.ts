import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: {
    position: "top-right",
  },
  async rewrites() {
    // When NEXT_PUBLIC_POCKETBASE_URL is set to a relative path (e.g. `/pb`)
    // we proxy /pb/* to the real PocketBase instance. This lets the browser
    // talk to PB over the same origin — required when running `next dev
    // --experimental-https` on a phone, where http://127.0.0.1:8090 would
    // be blocked as mixed content.
    const publicUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "";
    if (!publicUrl.startsWith("/")) return [];
    const target = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090";
    const prefix = publicUrl.replace(/\/+$/, "");
    return [
      {
        source: `${prefix}/:path*`,
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
