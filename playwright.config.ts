import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Run specs serially — the suite shares a single PocketBase instance and
  // several tests toggle app-wide settings (scheduling), so parallel workers
  // race on global state.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm run pb:dev",
      url: "http://127.0.0.1:8090/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "pnpm run dev:next",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
