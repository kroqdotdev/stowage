import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeRequest, readJson, seedUser } from "@/app/api/__tests__/helpers";
import { usePbHarness } from "@/test/pb-harness";

describe("users routes", () => {
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

  describe("GET /api/users", () => {
    it("returns 401 without a token", async () => {
      const { GET } = await import("@/app/api/users/route");
      const res = await GET(makeRequest("http://localhost/api/users"));
      expect(res.status).toBe(401);
    });

    it("returns 403 for a non-admin", async () => {
      const user = await seedUser(getHarness(), "user");
      const { GET } = await import("@/app/api/users/route");
      const res = await GET(
        makeRequest("http://localhost/api/users", { token: user.token }),
      );
      expect(res.status).toBe(403);
    });

    it("returns the user list for an admin", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { GET } = await import("@/app/api/users/route");
      const res = await GET(
        makeRequest("http://localhost/api/users", { token: admin.token }),
      );
      expect(res.status).toBe(200);
      const body = await readJson<{ users: { id: string }[] }>(res);
      expect(body.users.some((u) => u.id === admin.id)).toBe(true);
    });
  });

  describe("PATCH /api/users/[id]/role", () => {
    it("promotes a user to admin as admin", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const viewer = await seedUser(getHarness(), "user");

      const { PATCH } = await import("@/app/api/users/[id]/role/route");
      const res = await PATCH(
        makeRequest(`http://localhost/api/users/${viewer.id}/role`, {
          method: "PATCH",
          token: admin.token,
          json: { role: "admin" },
        }),
        { params: Promise.resolve({ id: viewer.id }) },
      );
      expect(res.status).toBe(200);
      const body = await readJson<{ user: { role: string } }>(res);
      expect(body.user.role).toBe("admin");
    });

    it("refuses to demote the last admin", async () => {
      const admin = await seedUser(getHarness(), "admin");
      const { PATCH } = await import("@/app/api/users/[id]/role/route");
      const res = await PATCH(
        makeRequest(`http://localhost/api/users/${admin.id}/role`, {
          method: "PATCH",
          token: admin.token,
          json: { role: "user" },
        }),
        { params: Promise.resolve({ id: admin.id }) },
      );
      expect([400, 409]).toContain(res.status);
    });

    it("returns 403 when a non-admin tries to change roles", async () => {
      const actor = await seedUser(getHarness(), "user");
      const target = await seedUser(getHarness(), "user");

      const { PATCH } = await import("@/app/api/users/[id]/role/route");
      const res = await PATCH(
        makeRequest(`http://localhost/api/users/${target.id}/role`, {
          method: "PATCH",
          token: actor.token,
          json: { role: "admin" },
        }),
        { params: Promise.resolve({ id: target.id }) },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/users/me/password", () => {
    it("rejects wrong current password with 400", async () => {
      const user = await seedUser(getHarness(), "user");
      const { POST } = await import("@/app/api/users/me/password/route");
      const res = await POST(
        makeRequest("http://localhost/api/users/me/password", {
          method: "POST",
          token: user.token,
          json: {
            currentPassword: "wrong",
            newPassword: "new-pass-1234",
          },
        }),
      );
      expect(res.status).toBe(400);
    });

    it("rejects unauthenticated callers with 401", async () => {
      const { POST } = await import("@/app/api/users/me/password/route");
      const res = await POST(
        makeRequest("http://localhost/api/users/me/password", {
          method: "POST",
          json: {
            currentPassword: "a",
            newPassword: "b",
          },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("changes the password with correct current password", async () => {
      const user = await seedUser(getHarness(), "user");
      const { POST } = await import("@/app/api/users/me/password/route");
      const res = await POST(
        makeRequest("http://localhost/api/users/me/password", {
          method: "POST",
          token: user.token,
          json: {
            currentPassword: user.password,
            newPassword: "new-password-1234",
          },
        }),
      );
      expect(res.status).toBe(200);
    });
  });
});
