import PocketBase from "pocketbase";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ForbiddenError,
  UnauthorizedError,
  createRequestSession,
  requireAdmin,
  requireUser,
  resolveSession,
} from "@/server/auth/session";
import { usePbHarness } from "@/test/pb-harness";

describe("auth session helpers", () => {
  const getHarness = usePbHarness();

  beforeEach(() => {
    vi.stubEnv("POCKETBASE_URL", getHarness().url);
    vi.stubEnv("POCKETBASE_SUPERUSER_EMAIL", "test@stowage.local");
    vi.stubEnv("POCKETBASE_SUPERUSER_PASSWORD", "test-password-12345");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function seedAndSignIn(role: "admin" | "user" = "admin") {
    const pb = getHarness().admin;
    const email = `user-${Math.random().toString(36).slice(2)}@stowage.local`;
    const password = "password123";
    await pb.collection("users").create({
      email,
      password,
      passwordConfirm: password,
      name: "Test User",
      role,
      createdAt: Date.now(),
    });
    const client = new PocketBase(getHarness().url);
    client.autoCancellation(false);
    const auth = await client
      .collection("users")
      .authWithPassword(email, password);
    return { email, password, token: auth.token, record: auth.record };
  }

  it("resolveSession returns null for an absent token", async () => {
    await expect(resolveSession(null)).resolves.toBeNull();
    await expect(resolveSession(undefined)).resolves.toBeNull();
    await expect(resolveSession("")).resolves.toBeNull();
  });

  it("resolveSession returns null for an invalid token", async () => {
    await expect(resolveSession("garbage.token.value")).resolves.toBeNull();
  });

  it("resolveSession returns the user for a valid token", async () => {
    const { token, record } = await seedAndSignIn("admin");
    const user = await resolveSession(token);
    expect(user).toMatchObject({
      id: record.id,
      email: record.email,
      role: "admin",
    });
  });

  it("createRequestSession captures refreshed auth state", async () => {
    const { token } = await seedAndSignIn("admin");
    const session = await createRequestSession(token);
    expect(session.user?.role).toBe("admin");
    expect(session.activeToken).toBeTruthy();
    expect(session.staleToken).toBe(false);
  });

  it("createRequestSession marks stale tokens", async () => {
    const session = await createRequestSession("garbage.token.value");
    expect(session.user).toBeNull();
    expect(session.activeToken).toBeNull();
    expect(session.staleToken).toBe(true);
  });

  it("requireUser / requireAdmin enforce roles", async () => {
    const { token: userToken } = await seedAndSignIn("user");
    const userSession = await createRequestSession(userToken);
    expect(requireUser(userSession).role).toBe("user");
    expect(() => requireAdmin(userSession)).toThrow(ForbiddenError);

    const { token: adminToken } = await seedAndSignIn("admin");
    const adminSession = await createRequestSession(adminToken);
    expect(requireAdmin(adminSession).role).toBe("admin");
  });

  it("requireUser throws UnauthorizedError when no token is present", async () => {
    const session = await createRequestSession(null);
    expect(() => requireUser(session)).toThrow(UnauthorizedError);
  });
});
