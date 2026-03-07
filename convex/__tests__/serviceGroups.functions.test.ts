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
      name: role === "admin" ? "Admin User" : "Member User",
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

async function createAsset(
  actor: ReturnType<typeof asUser>,
  name: string,
): Promise<Id<"assets">> {
  const created = await actor.mutation(api.assets.createAsset, {
    name,
    categoryId: null,
    locationId: null,
    serviceGroupId: null,
    status: "active",
    notes: null,
    customFieldValues: {},
    tagIds: [],
  });
  return created.assetId;
}

describe("serviceGroups functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
  });

  it("allows admins to create, update, and list groups", async () => {
    const admin = asUser(t, adminId);

    const created = await admin.mutation(api.serviceGroups.createGroup, {
      name: "Quarterly Checks",
      description: "Main engine and electrical checklist",
    });

    await admin.mutation(api.serviceGroups.updateGroup, {
      groupId: created.groupId,
      name: "Quarterly Engine Checks",
      description: "Updated description",
    });

    const groups = await admin.query(api.serviceGroups.listGroups, {});
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("Quarterly Engine Checks");
    expect(groups[0]?.fieldCount).toBe(0);
    expect(groups[0]?.assetCount).toBe(0);
  });

  it("blocks non-admin group writes", async () => {
    const user = asUser(t, userId);

    await expect(
      user.mutation(api.serviceGroups.createGroup, {
        name: "Unauthorized",
        description: null,
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("lists assets assigned to a group and prevents deleting groups in use", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const createdGroup = await admin.mutation(api.serviceGroups.createGroup, {
      name: "Pump Service",
      description: null,
    });

    const assetId = await createAsset(user, "Bilge Pump");
    await user.mutation(api.assets.updateAsset, {
      assetId,
      serviceGroupId: createdGroup.groupId,
    });

    const assignedAssets = await admin.query(
      api.serviceGroups.listGroupAssets,
      {
        groupId: createdGroup.groupId,
      },
    );
    expect(assignedAssets).toHaveLength(1);
    expect(assignedAssets[0]?._id).toBe(assetId);

    await expect(
      admin.mutation(api.serviceGroups.deleteGroup, {
        groupId: createdGroup.groupId,
      }),
    ).rejects.toThrow("cannot be deleted");
  });
});
