import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeRequest, readJson, seedUser } from "@/app/api/__tests__/helpers";
import { usePbHarness } from "@/test/pb-harness";

describe("assets routes", () => {
  const getHarness = usePbHarness();

  beforeEach(() => {
    const h = getHarness();
    vi.stubEnv("POCKETBASE_URL", h.url);
    vi.stubEnv("POCKETBASE_SUPERUSER_EMAIL", "test@stowage.local");
    vi.stubEnv("POCKETBASE_SUPERUSER_PASSWORD", "test-password-12345");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("POST /api/assets (withAdmin)", () => {
    it("rejects unauthenticated callers with 401", async () => {
      const { POST } = await import("@/app/api/assets/route");
      const res = await POST(
        makeRequest("http://localhost/api/assets", {
          method: "POST",
          json: { name: "New asset" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("rejects non-admin callers with 403", async () => {
      const user = await seedUser(getHarness(), "user");
      const { POST } = await import("@/app/api/assets/route");
      const res = await POST(
        makeRequest("http://localhost/api/assets", {
          method: "POST",
          token: user.token,
          json: { name: "New asset" },
        }),
      );
      expect(res.status).toBe(403);
    });

    it("rejects invalid bodies with 400", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/assets/route");
      const res = await POST(
        makeRequest("http://localhost/api/assets", {
          method: "POST",
          token: admin.token,
          json: { name: 42 },
        }),
      );
      expect(res.status).toBe(400);
    });

    it("creates an asset and returns 201 with the id", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/assets/route");
      const res = await POST(
        makeRequest("http://localhost/api/assets", {
          method: "POST",
          token: admin.token,
          json: { name: "Generator" },
        }),
      );
      expect(res.status).toBe(201);
      const body = await readJson<{ assetId: string }>(res);
      expect(body.assetId).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe("GET /api/assets (withUser)", () => {
    it("rejects unauthenticated callers with 401", async () => {
      const { GET } = await import("@/app/api/assets/route");
      const res = await GET(makeRequest("http://localhost/api/assets"));
      expect(res.status).toBe(401);
    });

    it("returns an empty list to an authenticated user with no assets", async () => {
      const user = await seedUser(getHarness(), "user");
      const { GET } = await import("@/app/api/assets/route");
      const res = await GET(
        makeRequest("http://localhost/api/assets", { token: user.token }),
      );
      expect(res.status).toBe(200);
      const body = await readJson<{ assets: unknown[] }>(res);
      expect(body.assets).toEqual([]);
    });
  });

  describe("DELETE /api/assets/[id] (withAdmin)", () => {
    it("returns 403 for a non-admin user", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const viewer = await seedUser(getHarness(), "user");
      const { POST } = await import("@/app/api/assets/route");
      const createRes = await POST(
        makeRequest("http://localhost/api/assets", {
          method: "POST",
          token: admin.token,
          json: { name: "ForDelete" },
        }),
      );
      const { assetId } = await readJson<{ assetId: string }>(createRes);

      const { DELETE } = await import("@/app/api/assets/[id]/route");
      const res = await DELETE(
        makeRequest(`http://localhost/api/assets/${assetId}`, {
          method: "DELETE",
          token: viewer.token,
        }),
        { params: Promise.resolve({ id: assetId }) },
      );
      expect(res.status).toBe(403);
    });

    it("returns 404 for an unknown id", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { DELETE } = await import("@/app/api/assets/[id]/route");
      const res = await DELETE(
        makeRequest("http://localhost/api/assets/nosuch", {
          method: "DELETE",
          token: admin.token,
        }),
        { params: Promise.resolve({ id: "nosuch" }) },
      );
      expect(res.status).toBe(404);
    });
  });
});
