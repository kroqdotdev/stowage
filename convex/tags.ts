import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";
import {
  normalizeCatalogNameKey,
  normalizeHexColor,
  requireCatalogName,
} from "./catalog_helpers";

const tagViewValidator = v.object({
  _id: v.id("tags"),
  _creationTime: v.number(),
  name: v.string(),
  color: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type TagRow = {
  _id: Id<"tags">;
  _creationTime: number;
  name: string;
  normalizedName: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

async function assertUniqueTagName(
  ctx: MutationCtx,
  normalizedName: string,
  excludeId?: Id<"tags">,
) {
  const matches = await ctx.db
    .query("tags")
    .withIndex("by_normalized_name", (q) =>
      q.eq("normalizedName", normalizedName),
    )
    .take(2);

  const duplicate = matches.find((tag) => tag._id !== excludeId);
  if (duplicate) {
    throw new ConvexError("A tag with this name already exists");
  }
}

export const listTags = query({
  args: {},
  returns: v.array(tagViewValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const tags = (await ctx.db.query("tags").collect()) as TagRow[];
    return tags
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map((tag) => ({
        _id: tag._id,
        _creationTime: tag._creationTime,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      }));
  },
});

export const createTag = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  returns: v.object({ tagId: v.id("tags") }),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const name = requireCatalogName(args.name);
    const normalizedName = normalizeCatalogNameKey(name);
    const color = normalizeHexColor(args.color);

    await assertUniqueTagName(ctx, normalizedName);

    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      name,
      normalizedName,
      color,
      createdAt: now,
      updatedAt: now,
    });

    return { tagId };
  },
});

export const updateTag = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.string(),
    color: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new ConvexError("Tag not found");
    }

    const name = requireCatalogName(args.name);
    const normalizedName = normalizeCatalogNameKey(name);
    const color = normalizeHexColor(args.color);

    await assertUniqueTagName(ctx, normalizedName, args.tagId);

    await ctx.db.patch(args.tagId, {
      name,
      normalizedName,
      color,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteTag = mutation({
  args: { tagId: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const tag = await ctx.db.get(args.tagId);
    if (!tag) {
      throw new ConvexError("Tag not found");
    }

    const linkedAssetTag = await ctx.db
      .query("assetTags")
      .withIndex("by_tagId", (q) => q.eq("tagId", args.tagId))
      .first();

    if (linkedAssetTag) {
      throw new ConvexError("Cannot delete a tag that is assigned to assets");
    }

    await ctx.db.delete(args.tagId);
    return null;
  },
});
