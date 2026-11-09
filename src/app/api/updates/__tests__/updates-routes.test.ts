import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeRequest, readJson, seedUser } from "@/app/api/__tests__/helpers";
import { usePbHarness } from "@/test/pb-harness";

function gh(tag: string) {
  return {
    tag_name: tag,
    name: tag,
    body: "- notes",
    html_url: `https://github.com/kroqdotdev/stowage/releases/tag/${tag}`,
    draft: false,
    prerelease: false,
    published_at: "2026-11-01T10:00:00Z",
  };
}

describe("updates routes", () => {
  const getHarness = usePbHarness();
  const realFetch = globalThis.fetch;

  beforeEach(async () => {
    const h = getHarness();
    vi.stubEnv("POCKETBASE_URL", h.url);
    vi.stubEnv("POCKETBASE_SUPERUSER_EMAIL", "test@stowage.local");
    vi.stubEnv("POCKETBASE_SUPERUSER_PASSWORD", "test-password-12345");
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.2.0");
    vi.stubEnv("STOWAGE_UPDATER_URL", "");
    vi.stubEnv("STOWAGE_UPDATER_TOKEN", "");
    const { resetReleaseCache } = await import("@/server/updates/releases");
    resetReleaseCache();
    // GitHub is stubbed; PocketBase traffic keeps using the real fetch.
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("api.github.com")) {
        return Promise.resolve(
          new Response(JSON.stringify([gh("v0.3.0"), gh("v0.2.0")]), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      return realFetch(input, init);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("GET /api/updates", () => {
    it("returns 401 without a token", async () => {
      const { GET } = await import("@/app/api/updates/route");
      const res = await GET(makeRequest("http://localhost/api/updates"));
      expect(res.status).toBe(401);
    });

    it("returns 403 for a non-admin", async () => {
      const user = await seedUser(getHarness(), "user");
      const { GET } = await import("@/app/api/updates/route");
      const res = await GET(
        makeRequest("http://localhost/api/updates", { token: user.token }),
      );
      expect(res.status).toBe(403);
    });

    it("returns the update view for an admin", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { GET } = await import("@/app/api/updates/route");
      const res = await GET(
        makeRequest("http://localhost/api/updates", { token: admin.token }),
      );
      expect(res.status).toBe(200);
      const body = await readJson<{
        current: { version: string };
        latest: { version: string } | null;
        updateAvailable: boolean;
        updater: { configured: boolean };
      }>(res);
      expect(body.current.version).toBe("0.2.0");
      expect(body.latest?.version).toBe("0.3.0");
      expect(body.updateAvailable).toBe(true);
      expect(body.updater.configured).toBe(false);
    });
  });

  describe("POST /api/updates/apply", () => {
    it("returns 403 for a non-admin", async () => {
      const user = await seedUser(getHarness(), "user");
      const { POST } = await import("@/app/api/updates/apply/route");
      const res = await POST(
        makeRequest("http://localhost/api/updates/apply", {
          method: "POST",
          token: user.token,
          json: { version: "0.3.0" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 for a malformed version", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/updates/apply/route");
      const res = await POST(
        makeRequest("http://localhost/api/updates/apply", {
          method: "POST",
          token: admin.token,
          json: { version: "latest; rm -rf /" },
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for a version that is not a newer release", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/updates/apply/route");
      const res = await POST(
        makeRequest("http://localhost/api/updates/apply", {
          method: "POST",
          token: admin.token,
          json: { version: "0.2.0" },
        }),
      );
      expect(res.status).toBe(400);
      const body = await readJson<{ error: string }>(res);
      expect(body.error).toMatch(/not a published release newer/);
    });

    it("returns 501 when no updater is configured", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/updates/apply/route");
      const res = await POST(
        makeRequest("http://localhost/api/updates/apply", {
          method: "POST",
          token: admin.token,
          json: { version: "0.3.0" },
        }),
      );
      expect(res.status).toBe(501);
    });
  });
});
