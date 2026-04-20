import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeRequest, readJson, seedUser } from "@/app/api/__tests__/helpers";
import { usePbHarness } from "@/test/pb-harness";

describe("auth routes", () => {
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

  describe("POST /api/auth/login", () => {
    it("returns 200 and sets pb_auth cookie for valid credentials", async () => {
      const user = await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/auth/login/route");

      const res = await POST(
        makeRequest("http://localhost/api/auth/login", {
          method: "POST",
          json: { email: user.email, password: user.password },
        }),
      );

      expect(res.status).toBe(200);
      const body = await readJson<{ user: { id: string; role: string } }>(res);
      expect(body.user.id).toBe(user.id);
      expect(body.user.role).toBe("admin");

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/pb_auth=/);
      expect(setCookie).toMatch(/HttpOnly/i);
    });

    it("returns 400 for invalid credentials", async () => {
      const user = await seedUser(getHarness(), "user");
      const { POST } = await import("@/app/api/auth/login/route");

      const res = await POST(
        makeRequest("http://localhost/api/auth/login", {
          method: "POST",
          json: { email: user.email, password: "wrong" },
        }),
      );

      expect(res.status).toBe(400);
      const body = await readJson<{ error: string }>(res);
      expect(body.error).toMatch(/Invalid email or password/i);
    });

    it("returns 400 for a malformed body", async () => {
      const { POST } = await import("@/app/api/auth/login/route");

      const res = await POST(
        makeRequest("http://localhost/api/auth/login", {
          method: "POST",
          json: { email: 123 },
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns user for a valid cookie", async () => {
      const user = await seedUser(getHarness(), "admin");
      const { GET } = await import("@/app/api/auth/me/route");

      const res = await GET(
        makeRequest("http://localhost/api/auth/me", { token: user.token }),
      );

      expect(res.status).toBe(200);
      const body = await readJson<{ user: { email: string } }>(res);
      expect(body.user.email).toBe(user.email);
    });

    it("returns {user: null} without a cookie", async () => {
      const { GET } = await import("@/app/api/auth/me/route");

      const res = await GET(
        makeRequest("http://localhost/api/auth/me"),
      );

      expect(res.status).toBe(200);
      const body = await readJson<{ user: unknown }>(res);
      expect(body.user).toBeNull();
    });

    it("clears the cookie when the token is stale", async () => {
      const { GET } = await import("@/app/api/auth/me/route");

      const res = await GET(
        makeRequest("http://localhost/api/auth/me", { token: "garbage" }),
      );

      expect(res.status).toBe(200);
      const body = await readJson<{ user: unknown }>(res);
      expect(body.user).toBeNull();
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/pb_auth=;/);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears the pb_auth cookie", async () => {
      const { POST } = await import("@/app/api/auth/logout/route");
      const res = await POST();
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toMatch(/pb_auth=;/);
      expect(setCookie).toMatch(/Max-Age=0/);
    });
  });

  describe("GET /api/auth/first-run", () => {
    it("returns firstRun=true when no users exist", async () => {
      const { GET } = await import("@/app/api/auth/first-run/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await readJson<{ firstRun: boolean }>(res);
      expect(body.firstRun).toBe(true);
    });

    it("returns firstRun=false after a user exists", async () => {
      await seedUser(getHarness(), "admin");
      const { GET } = await import("@/app/api/auth/first-run/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const body = await readJson<{ firstRun: boolean }>(res);
      expect(body.firstRun).toBe(false);
    });
  });

  describe("POST /api/auth/first-admin", () => {
    it("creates the first admin and returns a signed-in session", async () => {
      const { POST } = await import("@/app/api/auth/first-admin/route");
      const res = await POST(
        makeRequest("http://localhost/api/auth/first-admin", {
          method: "POST",
          json: {
            email: "first@stowage.local",
            name: "First Admin",
            password: "first-admin-pass",
          },
        }),
      );
      expect(res.status).toBe(200);
      const body = await readJson<{ user: { role: string } }>(res);
      expect(body.user.role).toBe("admin");
      expect(res.headers.get("set-cookie")).toMatch(/pb_auth=/);
    });

    it("refuses to create a second first-admin", async () => {
      await seedUser(getHarness(), "admin");
      const { POST } = await import("@/app/api/auth/first-admin/route");
      const res = await POST(
        makeRequest("http://localhost/api/auth/first-admin", {
          method: "POST",
          json: {
            email: "second@stowage.local",
            name: "Second",
            password: "second-pass",
          },
        }),
      );
      expect([400, 409]).toContain(res.status);
    });

    it("rejects short passwords with 400", async () => {
      const { POST } = await import("@/app/api/auth/first-admin/route");
      const res = await POST(
        makeRequest("http://localhost/api/auth/first-admin", {
          method: "POST",
          json: { email: "x@stowage.local", name: "X", password: "short" },
        }),
      );
      expect(res.status).toBe(400);
    });
  });
});
