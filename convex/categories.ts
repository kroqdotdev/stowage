import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
import { requireAdminUser, requireAuthenticatedUser } from "./authz"
import {
  normalizeCatalogNameKey,
  normalizeHexColor,
  normalizeOptionalText,
  normalizePrefix,
  requireCatalogName,
} from "./catalog_helpers"

const categoryViewValidator = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  name: v.string(),
  prefix: v.union(v.string(), v.null()),
  description: v.union(v.string(), v.null()),
  color: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

type CategoryRow = {
  _id: Id<"categories">
  _creationTime: number
  name: string
  normalizedName: string
  prefix: string | null
  description: string | null
  color: string
  createdAt: number
  updatedAt: number
}

function toCategoryView(category: {
  _id: Id<"categories">
  _creationTime: number
  name: string
  prefix: string | null
  description: string | null
  color: string
  createdAt: number
  updatedAt: number
}) {
  return {
    _id: category._id,
    _creationTime: category._creationTime,
    name: category.name,
    prefix: category.prefix,
    description: category.description,
    color: category.color,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  }
}

async function assertUniqueCategoryName(
  ctx: MutationCtx,
  normalizedName: string,
  excludeId?: Id<"categories">,
) {
  const matches = await ctx.db
    .query("categories")
    .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedName))
    .take(2)

  const duplicate = matches.find((category) => category._id !== excludeId)
  if (duplicate) {
    throw new ConvexError("A category with this name already exists")
  }
}

export const listCategories = query({
  args: {},
  returns: v.array(categoryViewValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx)

    const categories = (await ctx.db.query("categories").collect()) as CategoryRow[]

    return categories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      .map((category) => toCategoryView(category))
  },
})

export const createCategory = mutation({
  args: {
    name: v.string(),
    prefix: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    color: v.string(),
  },
  returns: v.object({ categoryId: v.id("categories") }),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const name = requireCatalogName(args.name)
    const normalizedName = normalizeCatalogNameKey(name)
    const prefix = normalizePrefix(args.prefix)
    const description = normalizeOptionalText(args.description)
    const color = normalizeHexColor(args.color)

    await assertUniqueCategoryName(ctx, normalizedName)

    const now = Date.now()
    const categoryId = await ctx.db.insert("categories", {
      name,
      normalizedName,
      prefix,
      description,
      color,
      createdAt: now,
      updatedAt: now,
    })

    return { categoryId }
  },
})

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    prefix: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    color: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const category = await ctx.db.get(args.categoryId)
    if (!category) {
      throw new ConvexError("Category not found")
    }

    const name = requireCatalogName(args.name)
    const normalizedName = normalizeCatalogNameKey(name)
    const prefix = normalizePrefix(args.prefix)
    const description = normalizeOptionalText(args.description)
    const color = normalizeHexColor(args.color)

    await assertUniqueCategoryName(ctx, normalizedName, args.categoryId)

    await ctx.db.patch(args.categoryId, {
      name,
      normalizedName,
      prefix,
      description,
      color,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const category = await ctx.db.get(args.categoryId)
    if (!category) {
      throw new ConvexError("Category not found")
    }

    // Asset referential guard is added in the assets phase when the `assets` table exists.
    await ctx.db.delete(args.categoryId)
    return null
  },
})
