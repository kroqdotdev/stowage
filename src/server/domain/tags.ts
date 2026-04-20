import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import {
  normalizeCatalogNameKey,
  normalizeHexColor,
  requireCatalogName,
} from "@/server/pb/catalog";
import type { Ctx } from "@/server/pb/context";
import { ConflictError, NotFoundError } from "@/server/pb/errors";

export const CreateTagInput = z.object({
  name: z.string(),
  color: z.string(),
});

export const UpdateTagInput = z.object({
  tagId: z.string(),
  name: z.string(),
  color: z.string(),
});

export type CreateTagInput = z.infer<typeof CreateTagInput>;
export type UpdateTagInput = z.infer<typeof UpdateTagInput>;

export type TagView = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

type TagRecord = {
  id: string;
  name: string;
  normalizedName: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

function toTagView(record: TagRecord): TagView {
  return {
    id: record.id,
    name: record.name,
    color: record.color,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function isDuplicateNameError(error: unknown) {
  return (
    error instanceof ClientResponseError &&
    error.status === 400 &&
    JSON.stringify(error.data ?? {}).includes("normalizedName")
  );
}

export async function listTags(ctx: Ctx): Promise<TagView[]> {
  // PB's SQL sort is lexicographic (uppercase before lowercase), so mixed-case
  // names would come back in the wrong order. Sort in JS with
  // localeCompare(..., { sensitivity: "base" }) instead.
  const records = await ctx.pb
    .collection("tags")
    .getFullList<TagRecord>();
  return records
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
    .map(toTagView);
}

export async function createTag(
  ctx: Ctx,
  input: CreateTagInput,
): Promise<TagView> {
  const parsed = CreateTagInput.parse(input);
  const name = requireCatalogName(parsed.name);
  const normalizedName = normalizeCatalogNameKey(name);
  const color = normalizeHexColor(parsed.color);
  const now = Date.now();

  try {
    const record = await ctx.pb.collection("tags").create<TagRecord>({
      name,
      normalizedName,
      color,
      createdAt: now,
      updatedAt: now,
    });
    return toTagView(record);
  } catch (error) {
    if (isDuplicateNameError(error)) {
      throw new ConflictError("A tag with this name already exists");
    }
    throw error;
  }
}

export async function updateTag(
  ctx: Ctx,
  input: UpdateTagInput,
): Promise<TagView> {
  const parsed = UpdateTagInput.parse(input);
  const name = requireCatalogName(parsed.name);
  const normalizedName = normalizeCatalogNameKey(name);
  const color = normalizeHexColor(parsed.color);

  try {
    const record = await ctx.pb
      .collection("tags")
      .update<TagRecord>(parsed.tagId, {
        name,
        normalizedName,
        color,
        updatedAt: Date.now(),
      });
    return toTagView(record);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Tag not found");
    }
    if (isDuplicateNameError(error)) {
      throw new ConflictError("A tag with this name already exists");
    }
    throw error;
  }
}

export async function deleteTag(ctx: Ctx, tagId: string): Promise<void> {
  try {
    await ctx.pb.collection("tags").getOne(tagId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Tag not found");
    }
    throw error;
  }

  const linked = await ctx.pb.collection("assetTags").getList(1, 1, {
    filter: `tagId = "${tagId}"`,
  });
  if (linked.totalItems > 0) {
    throw new ConflictError("Cannot delete a tag that is assigned to assets");
  }

  await ctx.pb.collection("tags").delete(tagId);
}
