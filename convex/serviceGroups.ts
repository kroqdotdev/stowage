import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";
import {
  normalizeServiceName,
  normalizeServiceNameKey,
  throwServiceRecordError,
} from "./service_record_helpers";

const serviceGroupValidator = v.object({
  _id: v.id("serviceGroups"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
});

const serviceGroupSummaryValidator = v.object({
  _id: v.id("serviceGroups"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
  assetCount: v.number(),
  fieldCount: v.number(),
});

const assignableGroupValidator = v.object({
  _id: v.id("serviceGroups"),
  name: v.string(),
});

const groupAssetValidator = v.object({
  _id: v.id("assets"),
  name: v.string(),
  assetTag: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("in_storage"),
    v.literal("under_repair"),
    v.literal("retired"),
    v.literal("disposed"),
  ),
});

type ServiceGroupRow = {
  _id: Id<"serviceGroups">;
  _creationTime: number;
  name: string;
  normalizedName: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

async function requireGroup(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"serviceGroups">,
) {
  const group = (await ctx.db.get(groupId)) as ServiceGroupRow | null;
  if (!group) {
    throwServiceRecordError("GROUP_NOT_FOUND", "Service group not found");
  }
  return group;
}

async function requireUniqueGroupName(
  ctx: QueryCtx | MutationCtx,
  name: string,
  existingGroupId?: Id<"serviceGroups">,
) {
  const normalizedName = normalizeServiceNameKey(name);
  const existing = (await ctx.db
    .query("serviceGroups")
    .withIndex("by_normalizedName", (q) =>
      q.eq("normalizedName", normalizedName),
    )
    .first()) as ServiceGroupRow | null;

  if (existing && existing._id !== existingGroupId) {
    throwServiceRecordError(
      "INVALID_FIELD_VALUE",
      "A service group with this name already exists",
    );
  }

  return normalizedName;
}

export const listGroups = query({
  args: {},
  returns: v.array(serviceGroupSummaryValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const groups = (await ctx.db.query("serviceGroups").collect()) as ServiceGroupRow[];
    const sortedGroups = groups
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );

    const [assetCounts, fieldCounts] = await Promise.all([
      Promise.all(
        sortedGroups.map(async (group) => {
          const assets = await ctx.db
            .query("assets")
            .withIndex("by_serviceGroupId", (q) =>
              q.eq("serviceGroupId", group._id),
            )
            .collect();
          return assets.length;
        }),
      ),
      Promise.all(
        sortedGroups.map(async (group) => {
          const fields = await ctx.db
            .query("serviceGroupFields")
            .withIndex("by_groupId_and_sortOrder", (q) =>
              q.eq("groupId", group._id),
            )
            .collect();
          return fields.length;
        }),
      ),
    ]);

    return sortedGroups.map((group, index) => ({
      _id: group._id,
      _creationTime: group._creationTime,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      assetCount: assetCounts[index] ?? 0,
      fieldCount: fieldCounts[index] ?? 0,
    }));
  },
});

export const listAssignableGroups = query({
  args: {},
  returns: v.array(assignableGroupValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    const groups = (await ctx.db.query("serviceGroups").collect()) as ServiceGroupRow[];
    return groups
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map((group) => ({
        _id: group._id,
        name: group.name,
      }));
  },
});

export const getGroup = query({
  args: { groupId: v.id("serviceGroups") },
  returns: v.union(serviceGroupValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const group = (await ctx.db.get(args.groupId)) as ServiceGroupRow | null;
    if (!group) {
      return null;
    }

    return {
      _id: group._id,
      _creationTime: group._creationTime,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      createdBy: group.createdBy,
      updatedBy: group.updatedBy,
    };
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({ groupId: v.id("serviceGroups") }),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const name = normalizeServiceName(args.name);
    if (!name) {
      throwServiceRecordError("INVALID_FIELD_VALUE", "Group name is required");
    }
    const normalizedName = await requireUniqueGroupName(ctx, name);
    const description = args.description?.trim() ? args.description.trim() : null;
    const now = Date.now();
    const groupId = await ctx.db.insert("serviceGroups", {
      name,
      normalizedName,
      description,
      createdAt: now,
      updatedAt: now,
      createdBy: actor._id as Id<"users">,
      updatedBy: actor._id as Id<"users">,
    });
    return { groupId };
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id("serviceGroups"),
    name: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const group = await requireGroup(ctx, args.groupId);
    const name = normalizeServiceName(args.name);
    if (!name) {
      throwServiceRecordError("INVALID_FIELD_VALUE", "Group name is required");
    }
    const normalizedName = await requireUniqueGroupName(ctx, name, group._id);
    const description = args.description?.trim() ? args.description.trim() : null;

    await ctx.db.patch(group._id, {
      name,
      normalizedName,
      description,
      updatedAt: Date.now(),
      updatedBy: actor._id as Id<"users">,
    });

    return null;
  },
});

export const deleteGroup = mutation({
  args: { groupId: v.id("serviceGroups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const group = await requireGroup(ctx, args.groupId);

    const [assetsUsingGroup, recordsUsingGroup] = await Promise.all([
      ctx.db
        .query("assets")
        .withIndex("by_serviceGroupId", (q) =>
          q.eq("serviceGroupId", group._id),
        )
        .collect(),
      ctx.db
        .query("serviceRecords")
        .withIndex("by_serviceGroupId_and_completedAt", (q) =>
          q.eq("serviceGroupId", group._id),
        )
        .first(),
    ]);

    if (assetsUsingGroup.length > 0 || recordsUsingGroup) {
      throwServiceRecordError(
        "GROUP_IN_USE",
        "This service group is in use and cannot be deleted",
      );
    }

    const fields = await ctx.db
      .query("serviceGroupFields")
      .withIndex("by_groupId_and_sortOrder", (q) => q.eq("groupId", group._id))
      .collect();

    await Promise.all(fields.map((field) => ctx.db.delete(field._id)));
    await ctx.db.delete(group._id);
    return null;
  },
});

export const listGroupAssets = query({
  args: { groupId: v.id("serviceGroups") },
  returns: v.array(groupAssetValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireGroup(ctx, args.groupId);

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_serviceGroupId", (q) =>
        q.eq("serviceGroupId", args.groupId),
      )
      .collect();

    return assets
      .slice()
      .sort((a, b) =>
        String((a as { name: string }).name).localeCompare(
          String((b as { name: string }).name),
          undefined,
          { sensitivity: "base" },
        ),
      )
      .map((asset) => {
        const row = asset as {
          _id: Id<"assets">;
          name: string;
          assetTag: string;
          status:
            | "active"
            | "in_storage"
            | "under_repair"
            | "retired"
            | "disposed";
        };
        return {
          _id: row._id,
          name: row.name,
          assetTag: row.assetTag,
          status: row.status,
        };
      });
  },
});
