import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const TINY_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAE0lEQVR4AWP8z8DwnwEImBigAAAfFwICgH3ifwAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const modules = import.meta.glob("../**/*.ts");

async function insertUser(
  t: ReturnType<typeof convexTest>,
  overrides: { email?: string; role?: "admin" | "user" } = {},
): Promise<Id<"users">> {
  const role = overrides.role ?? "admin";
  const email =
    overrides.email ??
    `${role}-${Math.random().toString(36).slice(2)}@example.com`;
  return (await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: role === "admin" ? "Admin" : "Member",
      email,
      role,
      createdBy: null,
      createdAt: Date.now(),
    }),
  )) as Id<"users">;
}

describe("getUserByEmailInternal", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema, modules);
  });

  it("returns null when no user has the given email", async () => {
    const result = await t.query(internal.users.getUserByEmailInternal, {
      email: "nobody@example.com",
    });
    expect(result).toBeNull();
  });

  it("returns the user matching the email", async () => {
    const email = "found@example.com";
    const userId = await insertUser(t, { email, role: "admin" });

    const result = await t.query(internal.users.getUserByEmailInternal, {
      email,
    });
    expect(result).not.toBeNull();
    expect(result!._id).toBe(userId);
    expect(result!.email).toBe(email);
    expect(result!.role).toBe("admin");
  });
});

describe("POST /api/provision", () => {
  let t: ReturnType<typeof convexTest>;
  const SECRET = "test-provision-secret-value";

  function provision(
    body: object | string | null,
    headers: Record<string, string> = {},
  ) {
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    };
    if (body !== null) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    return t.fetch("/api/provision", init);
  }

  beforeEach(() => {
    t = convexTest(schema, modules);
    vi.stubEnv("PROVISION_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when PROVISION_SECRET is not set", async () => {
    vi.stubEnv("PROVISION_SECRET", "");

    const res = await provision(
      { email: "a@b.com", name: "A", password: "12345678" },
      { Authorization: "Bearer whatever" },
    );
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/i);
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await provision({
      email: "a@b.com",
      name: "A",
      password: "12345678",
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 when Authorization header is wrong", async () => {
    const res = await provision(
      { email: "a@b.com", name: "A", password: "12345678" },
      { Authorization: "Bearer wrong-secret" },
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const res = await t.fetch("/api/provision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET}`,
      },
      body: "not json{",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 when required fields are missing", async () => {
    const cases = [
      { name: "A", password: "12345678" },
      { email: "a@b.com", password: "12345678" },
      { email: "a@b.com", name: "A" },
      {},
    ];

    for (const body of cases) {
      const res = await provision(body, {
        Authorization: `Bearer ${SECRET}`,
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/missing required fields/i);
    }
  });

  it("returns 409 when instance is provisioned with a different admin", async () => {
    await insertUser(t, { email: "existing@example.com", role: "admin" });

    const res = await provision(
      {
        email: "new-admin@example.com",
        name: "New Admin",
        password: "12345678",
      },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already provisioned/i);
  });

  it("returns 200 idempotently when admin already exists with same email", async () => {
    const email = "admin@example.com";
    const userId = await insertUser(t, { email, role: "admin" });

    const res = await provision(
      { email, name: "Admin", password: "12345678" },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("already_provisioned");
    expect(json.userId).toBe(userId);
  });

  it("returns 200 idempotently with case-insensitive email match", async () => {
    const userId = await insertUser(t, {
      email: "admin@example.com",
      role: "admin",
    });

    const res = await provision(
      { email: "  ADMIN@Example.COM  ", name: "Admin", password: "12345678" },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("already_provisioned");
    expect(json.userId).toBe(userId);
  });

  it("returns 409 when email matches a non-admin user", async () => {
    await insertUser(t, { email: "user@example.com", role: "user" });

    const res = await provision(
      { email: "user@example.com", name: "User", password: "12345678" },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already provisioned/i);
  });

  it("provisions a new admin on first run and returns 201", async () => {
    const isFirstRun = await t.query(api.users.checkFirstRun);
    expect(isFirstRun).toBe(true);

    const res = await provision(
      {
        email: "new@example.com",
        name: "New Admin",
        password: "secure-password-123",
      },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("provisioned");
    expect(json.userId).toBeDefined();

    const afterFirstRun = await t.query(api.users.checkFirstRun);
    expect(afterFirstRun).toBe(false);

    const user = await t.query(internal.users.getUserByEmailInternal, {
      email: "new@example.com",
    });
    expect(user).not.toBeNull();
    expect(user!.role).toBe("admin");
    expect(user!.name).toBe("New Admin");
  });
});

describe("GET /api/storage", () => {
  let t: ReturnType<typeof convexTest>;
  const SECRET = "test-provision-secret-value";

  function fetchStorage(headers: Record<string, string> = {}) {
    return t.fetch("/api/storage", {
      method: "GET",
      headers,
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    t = convexTest(schema, modules);
    vi.stubEnv("PROVISION_SECRET", SECRET);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("returns 503 when PROVISION_SECRET is not set", async () => {
    vi.stubEnv("PROVISION_SECRET", "");

    const res = await fetchStorage({ Authorization: "Bearer whatever" });
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/i);
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await fetchStorage();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 when Authorization header is wrong", async () => {
    const res = await fetchStorage({ Authorization: "Bearer wrong" });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns usage with null limit when STORAGE_LIMIT_GB is not set", async () => {
    vi.stubEnv("STORAGE_LIMIT_GB", "");

    const res = await fetchStorage({ Authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.usedBytes).toBe(0);
    expect(json.limitBytes).toBeNull();
    expect(json.usedFormatted).toBe("0 MB");
    expect(json.limitFormatted).toBeNull();
  });

  it("returns usage and limit when STORAGE_LIMIT_GB is set", async () => {
    vi.stubEnv("STORAGE_LIMIT_GB", "15");

    const res = await fetchStorage({ Authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.usedBytes).toBe(0);
    expect(json.limitBytes).toBe(15 * 1024 * 1024 * 1024);
    expect(json.usedFormatted).toBe("0 MB");
    expect(json.limitFormatted).toBe("15.0 GB");
  });

  it("reflects actual storage usage from uploaded files", async () => {
    vi.stubEnv("STORAGE_LIMIT_GB", "15");

    const adminId = await insertUser(t, { role: "admin" });
    const admin = t.withIdentity({ subject: adminId });

    const created = await admin.mutation(api.assets.createAsset, {
      name: "Storage test",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });

    const storageId = (await t.run(async (ctx) =>
      ctx.storage.store(
        new Blob([Buffer.from(TINY_PNG)], { type: "image/png" }),
      ),
    )) as Id<"_storage">;

    await admin.mutation(api.attachments.createAttachment, {
      assetId: created.assetId,
      storageId,
      fileName: "photo.png",
      fileType: "image/png",
      fileSize: TINY_PNG.byteLength,
    });

    await t.finishAllScheduledFunctions(() => {
      vi.runAllTimers();
    });

    const res = await fetchStorage({ Authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.usedBytes).toBeGreaterThan(0);
    expect(json.limitBytes).toBe(15 * 1024 * 1024 * 1024);
    expect(json.usedFormatted).toBeTypeOf("string");
    expect(json.limitFormatted).toBe("15.0 GB");
  });
});
