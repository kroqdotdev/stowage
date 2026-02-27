import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { requireAuthenticatedUser } from "./authz"
import { throwAssetError } from "./assets_helpers"

type AssetTagRow = {
  _id: Id<"assetTags">
  _creationTime: number
  assetId: Id<"assets">
  tagId: Id<"tags">
  createdBy: Id<"users">
  createdAt: number
}

type TagRow = {
  _id: Id<"tags">
  _creationTime: number
  name: string
  color: string
  normalizedName: string
  createdAt: number
  updatedAt: number
}

const assetTagViewValidator = v.object({
  _id: v.id("tags"),
  _creationTime: v.number(),
  name: v.string(),
  color: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

async function requireAssetExists(
  ctx: QueryCtx | MutationCtx,
  assetId: Id<"assets">,
) {
  const asset = await ctx.db.get(assetId)
  if (!asset) {
    throwAssetError("ASSET_NOT_FOUND", "Asset not found")
  }
}

function dedupeTagIds(tagIds: Id<"tags">[]) {
  const seen = new Set<string>()
  const deduped: Id<"tags">[] = []

  for (const tagId of tagIds) {
    const key = String(tagId)
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(tagId)
  }

  return deduped
}

async function assertAllTagsExist(ctx: QueryCtx | MutationCtx, tagIds: Id<"tags">[]) {
  for (const tagId of tagIds) {
    const tag = await ctx.db.get(tagId)
    if (!tag) {
      throwAssetError("TAG_NOT_FOUND", "One or more selected tags were not found")
    }
  }
}

export async function getTagIdsForAsset(
  ctx: QueryCtx | MutationCtx,
  assetId: Id<"assets">,
) {
  const links = (await ctx.db
    .query("assetTags")
    .withIndex("by_assetId", (q) => q.eq("assetId", assetId))
    .collect()) as AssetTagRow[]

  return links.map((link) => link.tagId)
}

export async function replaceAssetTags(
  ctx: MutationCtx,
  args: {
    assetId: Id<"assets">
    tagIds: Id<"tags">[]
    actorId: Id<"users">
  },
) {
  const dedupedTagIds = dedupeTagIds(args.tagIds)

  await requireAssetExists(ctx, args.assetId)
  await assertAllTagsExist(ctx, dedupedTagIds)

  const existingLinks = (await ctx.db
    .query("assetTags")
    .withIndex("by_assetId", (q) => q.eq("assetId", args.assetId))
    .collect()) as AssetTagRow[]

  const existingByTagId = new Map<string, AssetTagRow>(
    existingLinks.map((link) => [String(link.tagId), link]),
  )
  const wanted = new Set(dedupedTagIds.map((tagId) => String(tagId)))

  const deleteOps: Promise<void>[] = []
  for (const link of existingLinks) {
    if (!wanted.has(String(link.tagId))) {
      deleteOps.push(ctx.db.delete(link._id))
    }
  }

  const now = Date.now()
  const insertOps: Promise<Id<"assetTags">>[] = []
  for (const tagId of dedupedTagIds) {
    if (existingByTagId.has(String(tagId))) {
      continue
    }

    insertOps.push(
      ctx.db.insert("assetTags", {
        assetId: args.assetId,
        tagId,
        createdBy: args.actorId,
        createdAt: now,
      }),
    )
  }

  await Promise.all([...deleteOps, ...insertOps])
}

export async function listTagsForAsset(
  ctx: QueryCtx | MutationCtx,
  assetId: Id<"assets">,
) {
  const tagIds = await getTagIdsForAsset(ctx, assetId)
  const tags = (await Promise.all(tagIds.map((tagId) => ctx.db.get(tagId)))).filter(Boolean) as TagRow[]

  return tags
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map((tag) => ({
      _id: tag._id,
      _creationTime: tag._creationTime,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }))
}

export const setAssetTags = mutation({
  args: {
    assetId: v.id("assets"),
    tagIds: v.array(v.id("tags")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx)

    await replaceAssetTags(ctx, {
      assetId: args.assetId,
      tagIds: args.tagIds,
      actorId: actor._id as Id<"users">,
    })

    return null
  },
})

export const getAssetTags = query({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.array(assetTagViewValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx)
    await requireAssetExists(ctx, args.assetId)
    return listTagsForAsset(ctx, args.assetId)
  },
})
