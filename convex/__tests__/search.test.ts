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
      name: role === "admin" ? "Admin" : "Member",
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

describe("search functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
  });

  it("matches asset names, tags, and notes with category and location metadata", async () => {
    const admin = asUser(t, adminId);

    const category = await admin.mutation(api.categories.createCategory, {
      name: "IT",
      prefix: "IT",
      description: null,
      color: "#2563EB",
    });
    const location = await admin.mutation(api.locations.createLocation, {
      name: "Bridge",
      parentId: null,
      description: null,
    });

    await admin.mutation(api.assets.createAsset, {
      name: "Bridge server",
      categoryId: category.categoryId,
      locationId: location.locationId,
      status: "active",
      notes: "Main navigation server",
      customFieldValues: {},
      tagIds: [],
    });

    const byName = await admin.query(api.search.searchAssets, {
      term: "bridge",
      limit: 10,
    });
    const byTag = await admin.query(api.search.searchAssets, {
      term: "it-0001",
      limit: 10,
    });
    const byNotes = await admin.query(api.search.searchAssets, {
      term: "navigation",
      limit: 10,
    });

    expect(byName[0]?.name).toBe("Bridge server");
    expect(byName[0]?.categoryName).toBe("IT");
    expect(byName[0]?.locationPath).toBe("Bridge");
    expect(byTag[0]?._id).toBe(byName[0]?._id);
    expect(byNotes[0]?._id).toBe(byName[0]?._id);
  });

  it("is case-insensitive and caps results at ten", async () => {
    const admin = asUser(t, adminId);

    for (let index = 0; index < 12; index += 1) {
      await admin.mutation(api.assets.createAsset, {
        name: `Server Rack ${index}`,
        categoryId: null,
        locationId: null,
        status: "active",
        notes: `RACK-${index}`,
        customFieldValues: {},
        tagIds: [],
      });
    }

    const results = await admin.query(api.search.searchAssets, {
      term: "SERVER",
      limit: 20,
    });

    expect(results).toHaveLength(10);
    expect(results.every((result) => result.name.includes("Server Rack"))).toBe(
      true,
    );

    const limitedResults = await admin.query(api.search.searchAssets, {
      term: "SERVER",
      limit: 5,
    });
    expect(limitedResults).toHaveLength(5);
  });

  it("returns an empty array for too-short or non-matching terms", async () => {
    const admin = asUser(t, adminId);

    await admin.mutation(api.assets.createAsset, {
      name: "Compressor",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });

    await expect(
      admin.query(api.search.searchAssets, {
        term: "c",
        limit: 10,
      }),
    ).resolves.toEqual([]);

    await expect(
      admin.query(api.search.searchAssets, {
        term: "no-match",
        limit: 10,
      }),
    ).resolves.toEqual([]);
  });
});
