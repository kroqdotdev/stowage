import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  computeLocationPath,
  normalizeLocationDescription,
  normalizeLocationNameKey,
  replaceLocationPathPrefix,
  requireLocationName,
  wouldCreateLocationCycle,
} from "@/server/pb/locations";

const NullableId = z.string().nullish();

export const CreateLocationInput = z.object({
  name: z.string(),
  parentId: NullableId,
  description: z.string().nullish(),
});

export const UpdateLocationInput = z.object({
  locationId: z.string(),
  name: z.string(),
  parentId: NullableId,
  description: z.string().nullish(),
});

export const MoveLocationInput = z.object({
  locationId: z.string(),
  parentId: NullableId,
});

export type CreateLocationInput = z.infer<typeof CreateLocationInput>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationInput>;
export type MoveLocationInput = z.infer<typeof MoveLocationInput>;

export type LocationView = {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  path: string;
  createdAt: number;
  updatedAt: number;
};

type LocationRecord = {
  id: string;
  name: string;
  normalizedName: string;
  parentId: string;
  description: string;
  path: string;
  createdAt: number;
  updatedAt: number;
};

function toLocationView(record: LocationRecord): LocationView {
  return {
    id: record.id,
    name: record.name,
    parentId: record.parentId || null,
    description: record.description || null,
    path: record.path,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function sortByPath(records: LocationRecord[]) {
  return records
    .slice()
    .sort((a, b) =>
      a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
    );
}

function sortByName(records: LocationRecord[]) {
  return records
    .slice()
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

async function getLocationOrThrow(
  ctx: Ctx,
  locationId: string,
): Promise<LocationRecord> {
  try {
    return await ctx.pb
      .collection("locations")
      .getOne<LocationRecord>(locationId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Location not found");
    }
    throw error;
  }
}

async function loadParent(
  ctx: Ctx,
  parentId: string | null,
): Promise<LocationRecord | null> {
  if (!parentId) return null;
  try {
    return await ctx.pb
      .collection("locations")
      .getOne<LocationRecord>(parentId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new ValidationError("Parent location not found");
    }
    throw error;
  }
}

async function assertUniqueSiblingName(
  ctx: Ctx,
  parentId: string | null,
  normalizedName: string,
  excludeId?: string,
) {
  // PB stores empty relations as "" (not NULL), so the root-parent case needs
  // an explicit equality filter.
  const parentFilter = parentId ? `parentId = "${parentId}"` : `parentId = ""`;
  const nameEscaped = normalizedName.replace(/"/g, '\\"');
  const filter = `${parentFilter} && normalizedName = "${nameEscaped}"`;
  const matches = await ctx.pb
    .collection("locations")
    .getList<LocationRecord>(1, 2, { filter });
  const duplicate = matches.items.find((row) => row.id !== excludeId);
  if (duplicate) {
    throw new ConflictError(
      "A location with this name already exists at this level",
    );
  }
}

async function updateDescendantPaths(
  ctx: Ctx,
  oldPath: string,
  newPath: string,
  changedAt: number,
) {
  if (oldPath === newPath) return;
  const all = await ctx.pb
    .collection("locations")
    .getFullList<LocationRecord>();
  const descendants = all.filter(
    (location) =>
      location.path !== oldPath &&
      location.path.startsWith(`${oldPath}${" / "}`),
  );

  for (const descendant of descendants) {
    await ctx.pb.collection("locations").update(descendant.id, {
      path: replaceLocationPathPrefix(descendant.path, oldPath, newPath),
      updatedAt: changedAt,
    });
  }
}

export async function listLocations(ctx: Ctx): Promise<LocationView[]> {
  const records = await ctx.pb
    .collection("locations")
    .getFullList<LocationRecord>();
  return sortByPath(records).map(toLocationView);
}

export async function getLocationChildren(
  ctx: Ctx,
  parentId: string | null,
): Promise<LocationView[]> {
  const filter = parentId ? `parentId = "${parentId}"` : `parentId = ""`;
  const records = await ctx.pb
    .collection("locations")
    .getFullList<LocationRecord>({ filter });
  return sortByName(records).map(toLocationView);
}

export async function getLocationPath(
  ctx: Ctx,
  locationId: string,
): Promise<string | null> {
  try {
    const record = await ctx.pb
      .collection("locations")
      .getOne<LocationRecord>(locationId);
    return record.path;
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createLocation(
  ctx: Ctx,
  input: CreateLocationInput,
): Promise<LocationView> {
  const parsed = CreateLocationInput.parse(input);
  const name = requireLocationName(parsed.name);
  const normalizedName = normalizeLocationNameKey(name);
  const description = normalizeLocationDescription(parsed.description ?? null);
  const parent = await loadParent(ctx, parsed.parentId ?? null);
  await assertUniqueSiblingName(ctx, parent?.id ?? null, normalizedName);

  const now = Date.now();
  const record = await ctx.pb.collection("locations").create<LocationRecord>({
    name,
    normalizedName,
    parentId: parent?.id ?? "",
    description: description ?? "",
    path: computeLocationPath(parent?.path ?? null, name),
    createdAt: now,
    updatedAt: now,
  });
  return toLocationView(record);
}

type UpdateCoreArgs = {
  locationId: string;
  name?: string;
  parentId?: string | null;
  description?: string | null;
};

async function updateLocationCore(
  ctx: Ctx,
  args: UpdateCoreArgs,
): Promise<LocationView> {
  const existing = await getLocationOrThrow(ctx, args.locationId);
  const nextName =
    args.name === undefined ? existing.name : requireLocationName(args.name);
  const nextNormalizedName = normalizeLocationNameKey(nextName);
  const nextDescription =
    args.description === undefined
      ? existing.description
      : (normalizeLocationDescription(args.description) ?? "");
  const nextParentId =
    args.parentId === undefined ? existing.parentId || null : args.parentId;

  if (nextParentId === existing.id) {
    throw new ValidationError("A location cannot be its own parent");
  }

  const allLocations = await ctx.pb
    .collection("locations")
    .getFullList<LocationRecord>();
  const byId = new Map(
    allLocations.map((location) => [
      location.id,
      {
        id: location.id,
        parentId: location.parentId || null,
      },
    ]),
  );

  if (wouldCreateLocationCycle(existing.id, nextParentId, byId)) {
    throw new ValidationError(
      "A location cannot be moved inside one of its descendants",
    );
  }

  const parent = await loadParent(ctx, nextParentId);
  await assertUniqueSiblingName(
    ctx,
    parent?.id ?? null,
    nextNormalizedName,
    existing.id,
  );

  const nextPath = computeLocationPath(parent?.path ?? null, nextName);
  const changedAt = Date.now();

  const updated = await ctx.pb
    .collection("locations")
    .update<LocationRecord>(existing.id, {
      name: nextName,
      normalizedName: nextNormalizedName,
      parentId: parent?.id ?? "",
      description: nextDescription,
      path: nextPath,
      updatedAt: changedAt,
    });

  await updateDescendantPaths(ctx, existing.path, nextPath, changedAt);

  return toLocationView(updated);
}

export async function updateLocation(
  ctx: Ctx,
  input: UpdateLocationInput,
): Promise<LocationView> {
  const parsed = UpdateLocationInput.parse(input);
  return updateLocationCore(ctx, {
    locationId: parsed.locationId,
    name: parsed.name,
    parentId: parsed.parentId ?? null,
    description: parsed.description ?? null,
  });
}

export async function moveLocation(
  ctx: Ctx,
  input: MoveLocationInput,
): Promise<LocationView> {
  const parsed = MoveLocationInput.parse(input);
  return updateLocationCore(ctx, {
    locationId: parsed.locationId,
    parentId: parsed.parentId ?? null,
  });
}

export async function deleteLocation(
  ctx: Ctx,
  locationId: string,
): Promise<void> {
  const location = await getLocationOrThrow(ctx, locationId);

  const childCount = await ctx.pb
    .collection("locations")
    .getList(1, 1, { filter: `parentId = "${location.id}"` });
  if (childCount.totalItems > 0) {
    throw new ConflictError("Delete child locations first");
  }

  const linkedAsset = await ctx.pb
    .collection("assets")
    .getList(1, 1, { filter: `locationId = "${location.id}"` });
  if (linkedAsset.totalItems > 0) {
    throw new ConflictError(
      "Cannot delete a location that is assigned to assets",
    );
  }

  await ctx.pb.collection("locations").delete(location.id);
}
