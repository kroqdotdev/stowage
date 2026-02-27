import { beforeEach, describe, expect, it } from "vitest"
import { convexTest } from "convex-test"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"

const modules = import.meta.glob("../**/*.ts")

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
  )) as Id<"users">
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId })
}

describe("assets functions", () => {
  let t: ReturnType<typeof convexTest>
  let adminId: Id<"users">
  let userId: Id<"users">

  beforeEach(async () => {
    t = convexTest(schema, modules)
    adminId = await insertUser(t, "admin")
    userId = await insertUser(t, "user")
  })

  it("generates asset tags with category prefix and default prefix", async () => {
    const admin = asUser(t, adminId)

    const category = await admin.mutation(api.categories.createCategory, {
      name: "IT",
      prefix: "IT",
      description: null,
      color: "#2563EB",
    })

    const first = await admin.query(api.assets.generateAssetTag, {
      categoryId: category.categoryId,
    })
    expect(first.assetTag).toBe("IT-0001")

    await admin.mutation(api.assets.createAsset, {
      name: "Laptop",
      categoryId: category.categoryId,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    })

    const second = await admin.query(api.assets.generateAssetTag, {
      categoryId: category.categoryId,
    })
    expect(second.assetTag).toBe("IT-0002")

    const defaultTag = await admin.query(api.assets.generateAssetTag, {
      categoryId: null,
    })
    expect(defaultTag.assetTag).toBe("AST-0001")
  })

  it("creates assets and updates custom field usage counts", async () => {
    const admin = asUser(t, adminId)

    const serialField = await admin.mutation(api.customFields.createFieldDefinition, {
      name: "Serial",
      fieldType: "text",
      options: [],
      required: true,
    })

    const created = await admin.mutation(api.assets.createAsset, {
      name: "Router",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: "Core network",
      customFieldValues: {
        [serialField.fieldDefinitionId]: "ABC-123",
      },
      tagIds: [],
    })

    const asset = await admin.query(api.assets.getAsset, {
      assetId: created.assetId,
    })

    expect(asset?.name).toBe("Router")
    expect(asset?.assetTag).toBe("AST-0001")

    const fields = await admin.query(api.customFields.listFieldDefinitions, {})
    expect(fields[0]?.usageCount).toBe(1)
  })

  it("filters and searches assets", async () => {
    const admin = asUser(t, adminId)

    const categoryA = await admin.mutation(api.categories.createCategory, {
      name: "IT",
      prefix: "IT",
      description: null,
      color: "#2563EB",
    })
    const categoryB = await admin.mutation(api.categories.createCategory, {
      name: "Ops",
      prefix: "OPS",
      description: null,
      color: "#16A34A",
    })

    await admin.mutation(api.assets.createAsset, {
      name: "Server A",
      categoryId: categoryA.categoryId,
      locationId: null,
      status: "active",
      notes: "Rack 1",
      customFieldValues: {},
      tagIds: [],
    })

    const urgentTag = await admin.mutation(api.tags.createTag, {
      name: "Urgent",
      color: "#DC2626",
    })

    await admin.mutation(api.assets.createAsset, {
      name: "Generator",
      categoryId: categoryB.categoryId,
      locationId: null,
      status: "under_repair",
      notes: "Backup power",
      customFieldValues: {},
      tagIds: [urgentTag.tagId],
    })

    const filtered = await admin.query(api.assets.listAssets, {
      categoryId: categoryB.categoryId,
      status: "under_repair",
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.name).toBe("Generator")

    const search = await admin.query(api.assets.searchAssets, {
      query: "rack",
      limit: 10,
    })

    expect(search).toHaveLength(1)
    expect(search[0]?.name).toBe("Server A")

    const tagSearch = await admin.query(api.assets.searchAssets, {
      query: "urgent",
      limit: 10,
    })

    expect(tagSearch).toHaveLength(1)
    expect(tagSearch[0]?.name).toBe("Generator")
  })

  it("updates assets and replaces tags", async () => {
    const admin = asUser(t, adminId)

    const created = await admin.mutation(api.assets.createAsset, {
      name: "Workstation",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    })

    const firstTag = await admin.mutation(api.tags.createTag, {
      name: "Office",
      color: "#9333EA",
    })
    const secondTag = await admin.mutation(api.tags.createTag, {
      name: "Critical",
      color: "#DC2626",
    })

    await admin.mutation(api.assets.updateAsset, {
      assetId: created.assetId,
      name: "Workstation 2",
      status: "retired",
      tagIds: [firstTag.tagId, secondTag.tagId],
    })

    const detail = await admin.query(api.assets.getAsset, {
      assetId: created.assetId,
    })

    expect(detail?.name).toBe("Workstation 2")
    expect(detail?.status).toBe("retired")
    expect(detail?.tags.map((tag) => tag.name)).toEqual(["Critical", "Office"])
  })

  it("deletes assets with cascade and admin-only guard", async () => {
    const admin = asUser(t, adminId)
    const member = asUser(t, userId)

    const tag = await admin.mutation(api.tags.createTag, {
      name: "Tracked",
      color: "#0EA5E9",
    })

    const created = await admin.mutation(api.assets.createAsset, {
      name: "Camera",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [tag.tagId],
    })

    await expect(
      member.mutation(api.assets.deleteAsset, {
        assetId: created.assetId,
      }),
    ).rejects.toThrow("Admin access required")

    await admin.mutation(api.assets.deleteAsset, {
      assetId: created.assetId,
    })

    const deleted = await admin.query(api.assets.getAsset, {
      assetId: created.assetId,
    })
    expect(deleted).toBeNull()

    const tagLinks = await t.run(async (ctx) => ctx.db.query("assetTags").collect())
    expect(tagLinks.filter((link) => link.tagId === tag.tagId)).toHaveLength(0)
  })

  it("rejects invalid asset payloads", async () => {
    const admin = asUser(t, adminId)

    await expect(
      admin.mutation(api.assets.createAsset, {
        name: "",
        categoryId: null,
        locationId: null,
        status: "active",
        notes: null,
        customFieldValues: {},
        tagIds: [],
      }),
    ).rejects.toThrow("Asset name is required")
  })
})
