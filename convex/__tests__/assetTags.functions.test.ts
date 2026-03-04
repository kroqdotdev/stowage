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
      name: role === "admin" ? "Admin" : "User",
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

describe("assetTags functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
  });

  it("replaces asset tags and lists assigned tags", async () => {
    const admin = asUser(t, adminId);

    const asset = await admin.mutation(api.assets.createAsset, {
      name: "Switch",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });

    const tagA = await admin.mutation(api.tags.createTag, {
      name: "Network",
      color: "#0891B2",
    });
    const tagB = await admin.mutation(api.tags.createTag, {
      name: "Urgent",
      color: "#DC2626",
    });

    await admin.mutation(api.assetTags.setAssetTags, {
      assetId: asset.assetId,
      tagIds: [tagA.tagId, tagB.tagId],
    });

    let assigned = await admin.query(api.assetTags.getAssetTags, {
      assetId: asset.assetId,
    });
    expect(assigned.map((tag) => tag.name)).toEqual(["Network", "Urgent"]);

    await admin.mutation(api.assetTags.setAssetTags, {
      assetId: asset.assetId,
      tagIds: [tagB.tagId],
    });

    assigned = await admin.query(api.assetTags.getAssetTags, {
      assetId: asset.assetId,
    });
    expect(assigned.map((tag) => tag.name)).toEqual(["Urgent"]);
  });

  it("rejects tag assignment with unknown tag", async () => {
    const admin = asUser(t, adminId);

    const asset = await admin.mutation(api.assets.createAsset, {
      name: "Projector",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });

    const staleTag = await admin.mutation(api.tags.createTag, {
      name: "Temporary",
      color: "#64748B",
    });
    await admin.mutation(api.tags.deleteTag, { tagId: staleTag.tagId });

    await expect(
      admin.mutation(api.assetTags.setAssetTags, {
        assetId: asset.assetId,
        tagIds: [staleTag.tagId],
      }),
    ).rejects.toThrow("selected tags");
  });
});
