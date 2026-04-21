import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;
