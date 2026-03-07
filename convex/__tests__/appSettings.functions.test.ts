import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function insertUser(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user",
): Promise<Id<"users">> {
  return (await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: role === "admin" ? "Admin User" : "Standard User",
      email: `${role}-${Math.random().toString(36).slice(2)}@example.com`,
      role,
      createdBy: null,
      createdAt: Date.now(),
    }),
  )) as Id<"users">;
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

describe("appSettings functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
  });

  it("returns default date format when settings row does not exist", async () => {
    const admin = asUser(t, adminId);
    const settings = await admin.query(api.appSettings.getAppSettings, {});

    expect(settings).toEqual({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
  });

  it("allows admin to update global date format", async () => {
    const admin = asUser(t, adminId);
    const updated = await admin.mutation(api.appSettings.updateDateFormat, {
      dateFormat: "MM-DD-YYYY",
    });

    expect(updated.dateFormat).toBe("MM-DD-YYYY");
    expect(updated.serviceSchedulingEnabled).toBe(true);
    expect(typeof updated.updatedAt).toBe("number");

    const after = await admin.query(api.appSettings.getAppSettings, {});
    expect(after.dateFormat).toBe("MM-DD-YYYY");
    expect(after.serviceSchedulingEnabled).toBe(true);
  });

  it("rejects non-admin updates", async () => {
    const member = asUser(t, userId);

    await expect(
      member.mutation(api.appSettings.updateDateFormat, {
        dateFormat: "YYYY-MM-DD",
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("allows admin to toggle service scheduling", async () => {
    const admin = asUser(t, adminId);

    const updated = await admin.mutation(
      api.appSettings.updateServiceSchedulingEnabled,
      { enabled: false },
    );

    expect(updated.serviceSchedulingEnabled).toBe(false);
    expect(updated.dateFormat).toBe("DD-MM-YYYY");

    const after = await admin.query(api.appSettings.getAppSettings, {});
    expect(after.serviceSchedulingEnabled).toBe(false);
  });
});
