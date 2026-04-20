import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "pb",
    environment: "node",
    include: [
      "src/server/**/__tests__/**/*.test.ts",
      "src/app/api/**/__tests__/**/*.test.ts",
    ],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only is a Next.js build-time marker; in tests we run these
      // modules directly in Node, so stub it out.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
