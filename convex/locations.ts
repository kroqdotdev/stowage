import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";
import {
  computeLocationPath,
  normalizeLocationDescription,
  normalizeLocationNameKey,
  replaceLocationPathPrefix,
  requireLocationName,
  wouldCreateLocationCycle,
} from "./locations_helpers";

const nullableLocationIdValidator = v.union(v.id("locations"), v.null());

const locationViewValidator = v.object({
  _id: v.id("locations"),
  _creationTime: v.number(),
  name: v.string(),
  parentId: nullableLocationIdValidator,
  description: v.union(v.string(), v.null()),
  path: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type LocationRow = {
  _id: Id<"locations">;
  _creationTime: number;
  name: string;
  normalizedName: string;
  parentId: Id<"locations"> | null;
  description: string | null;
  path: string;
  createdAt: number;
  updatedAt: number;
};

function toLocationView(location: LocationRow) {
  return {
    _id: location._id,
    _creationTime: location._creationTime,
    name: location.name,
    parentId: location.parentId,
    description: location.description,
    path: location.path,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  };
}

async function getLocationOrThrow(
  ctx: MutationCtx,
  locationId: Id<"locations">,
) {
  const location = (await ctx.db.get(locationId)) as LocationRow | null;
  if (!location) {
    throw new ConvexError("Location not found");
  }
  return location;
}

async function getParentLocation(
  ctx: MutationCtx,
  parentId: Id<"locations"> | null,
): Promise<LocationRow | null> {
  if (!parentId) {
    return null;
  }

  const parent = (await ctx.db.get(parentId)) as LocationRow | null;
  if (!parent) {
    throw new ConvexError("Parent location not found");
  }

  return parent;
}

async function assertUniqueSiblingName(
  ctx: MutationCtx,
  parentId: Id<"locations"> | null,
  normalizedName: string,
  excludeId?: Id<"locations">,
) {
  const matches = await ctx.db
    .query("locations")
    .withIndex("by_parentId_and_normalizedName", (q) =>
      q.eq("parentId", parentId).eq("normalizedName", normalizedName),
    )
    .take(2);

  const duplicate = matches.find((location) => location._id !== excludeId);
  if (duplicate) {
    throw new ConvexError(
      "A location with this name already exists at this level",
    );
  }
}

async function patchDescendantPaths(
  ctx: MutationCtx,
  oldPath: string,
  newPath: string,
  changedAt: number,
) {
  if (oldPath === newPath) {
    return;
  }

  const allLocations = (await ctx.db
    .query("locations")
    .collect()) as LocationRow[];
  const descendants = allLocations.filter(
    (location) =>
      location.path !== oldPath && location.path.startsWith(`${oldPath} / `),
  );

  await Promise.all(
    descendants.map((location) =>
      ctx.db.patch(location._id, {
        path: replaceLocationPathPrefix(location.path, oldPath, newPath),
        updatedAt: changedAt,
      }),
    ),
  );
}

async function updateLocationCore(
  ctx: MutationCtx,
  args: {
    locationId: Id<"locations">;
    name?: string;
    description?: string | null;
    parentId?: Id<"locations"> | null;
  },
) {
  const existing = await getLocationOrThrow(ctx, args.locationId);
  const nextName =
    args.name === undefined ? existing.name : requireLocationName(args.name);
  const nextNormalizedName = normalizeLocationNameKey(nextName);
  const nextDescription =
    args.description === undefined
      ? existing.description
      : normalizeLocationDescription(args.description);
  const nextParentId =
    args.parentId === undefined ? existing.parentId : args.parentId;

  if (nextParentId === existing._id) {
    throw new ConvexError("A location cannot be its own parent");
  }

  const allLocations = (await ctx.db
    .query("locations")
    .collect()) as LocationRow[];
  const byId = new Map(
    allLocations.map((location) => [
      location._id as string,
      {
        _id: location._id as string,
        parentId: location.parentId as string | null,
      },
    ]),
  );

  if (
    wouldCreateLocationCycle(
      existing._id as string,
      (nextParentId as string | null) ?? null,
      byId,
    )
  ) {
    throw new ConvexError(
      "A location cannot be moved inside one of its descendants",
    );
  }

  const parent = await getParentLocation(ctx, nextParentId ?? null);
  await assertUniqueSiblingName(
    ctx,
    parent?._id ?? null,
    nextNormalizedName,
    existing._id,
  );

  const nextPath = computeLocationPath(parent?.path ?? null, nextName);
  const changedAt = Date.now();

  await ctx.db.patch(existing._id, {
    name: nextName,
    normalizedName: nextNormalizedName,
    parentId: parent?._id ?? null,
    description: nextDescription,
    path: nextPath,
    updatedAt: changedAt,
  });

  await patchDescendantPaths(ctx, existing.path, nextPath, changedAt);
}

export const listLocations = query({
  args: {},
  returns: v.array(locationViewValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const locations = (await ctx.db
      .query("locations")
      .collect()) as LocationRow[];
    return locations
      .slice()
      .sort((a, b) =>
        a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
      )
      .map(toLocationView);
  },
});

export const getLocationChildren = query({
  args: { parentId: nullableLocationIdValidator },
  returns: v.array(locationViewValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const children = (await ctx.db
      .query("locations")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId))
      .collect()) as LocationRow[];

    return children
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map(toLocationView);
  },
});

export const getLocationPath = query({
  args: { locationId: v.id("locations") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const location = (await ctx.db.get(args.locationId)) as LocationRow | null;
    return location?.path ?? null;
  },
});

export const createLocation = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(nullableLocationIdValidator),
    description: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({ locationId: v.id("locations") }),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const name = requireLocationName(args.name);
    const normalizedName = normalizeLocationNameKey(name);
    const description = normalizeLocationDescription(args.description);
    const parent = await getParentLocation(ctx, args.parentId ?? null);

    await assertUniqueSiblingName(ctx, parent?._id ?? null, normalizedName);

    const now = Date.now();
    const locationId = await ctx.db.insert("locations", {
      name,
      normalizedName,
      parentId: parent?._id ?? null,
      description,
      path: computeLocationPath(parent?.path ?? null, name),
      createdAt: now,
      updatedAt: now,
    });

    return { locationId };
  },
});

export const updateLocation = mutation({
  args: {
    locationId: v.id("locations"),
    name: v.string(),
    parentId: nullableLocationIdValidator,
    description: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    await updateLocationCore(ctx, {
      locationId: args.locationId,
      name: args.name,
      parentId: args.parentId,
      description: args.description,
    });
    return null;
  },
});

export const moveLocation = mutation({
  args: {
    locationId: v.id("locations"),
    parentId: nullableLocationIdValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    await updateLocationCore(ctx, {
      locationId: args.locationId,
      parentId: args.parentId,
    });
    return null;
  },
});

export const deleteLocation = mutation({
  args: { locationId: v.id("locations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const location = await getLocationOrThrow(ctx, args.locationId);
    const children = await ctx.db
      .query("locations")
      .withIndex("by_parentId", (q) => q.eq("parentId", location._id))
      .take(1);

    if (children.length > 0) {
      throw new ConvexError("Delete child locations first");
    }

    const linkedAsset = await ctx.db
      .query("assets")
      .withIndex("by_locationId", (q) => q.eq("locationId", location._id))
      .first();

    if (linkedAsset) {
      throw new ConvexError(
        "Cannot delete a location that is assigned to assets",
      );
    }

    await ctx.db.delete(location._id);
    return null;
  },
});
