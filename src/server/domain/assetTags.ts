import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import { NotFoundError, ValidationError } from "@/server/pb/errors";

type AssetTagLinkRecord = {
  id: string;
  assetId: string;
  tagId: string;
  createdBy: string;
  createdAt: number;
};

type TagRecord = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type AssetTagView = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export const SetAssetTagsInput = z.object({
  assetId: z.string(),
  tagIds: z.array(z.string()),
  actorId: z.string(),
});

export type SetAssetTagsInput = z.infer<typeof SetAssetTagsInput>;

function dedupe(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function assertAssetExists(ctx: Ctx, assetId: string) {
  try {
    await ctx.pb.collection("assets").getOne(assetId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Asset not found");
    }
    throw error;
  }
}

async function assertAllTagsExist(ctx: Ctx, tagIds: string[]) {
  if (tagIds.length === 0) return;
  for (const tagId of tagIds) {
    try {
      await ctx.pb.collection("tags").getOne(tagId);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) {
        throw new ValidationError(
          "One or more selected tags were not found",
        );
      }
      throw error;
    }
  }
}

export async function getTagIdsForAsset(
  ctx: Ctx,
  assetId: string,
): Promise<string[]> {
  const links = await ctx.pb
    .collection("assetTags")
    .getFullList<AssetTagLinkRecord>({ filter: `assetId = "${assetId}"` });
  return links.map((link) => link.tagId);
}

export async function replaceAssetTags(
  ctx: Ctx,
  assetId: string,
  tagIds: string[],
  actorId: string,
): Promise<void> {
  const deduped = dedupe(tagIds);
  await assertAssetExists(ctx, assetId);
  await assertAllTagsExist(ctx, deduped);

  const existingLinks = await ctx.pb
    .collection("assetTags")
    .getFullList<AssetTagLinkRecord>({ filter: `assetId = "${assetId}"` });
  const existingByTagId = new Map(
    existingLinks.map((link) => [link.tagId, link]),
  );
  const wanted = new Set(deduped);

  for (const link of existingLinks) {
    if (!wanted.has(link.tagId)) {
      await ctx.pb.collection("assetTags").delete(link.id);
    }
  }

  const now = Date.now();
  for (const tagId of deduped) {
    if (existingByTagId.has(tagId)) continue;
    await ctx.pb.collection("assetTags").create({
      assetId,
      tagId,
      createdBy: actorId,
      createdAt: now,
    });
  }
}

export async function listTagsForAsset(
  ctx: Ctx,
  assetId: string,
): Promise<AssetTagView[]> {
  const tagIds = await getTagIdsForAsset(ctx, assetId);
  if (tagIds.length === 0) return [];

  const tags: TagRecord[] = [];
  for (const tagId of tagIds) {
    try {
      tags.push(
        await ctx.pb.collection("tags").getOne<TagRecord>(tagId),
      );
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  return tags
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));
}

export async function setAssetTags(
  ctx: Ctx,
  input: SetAssetTagsInput,
): Promise<void> {
  const parsed = SetAssetTagsInput.parse(input);
  await replaceAssetTags(ctx, parsed.assetId, parsed.tagIds, parsed.actorId);
}

export async function getAssetTags(
  ctx: Ctx,
  assetId: string,
): Promise<AssetTagView[]> {
  await assertAssetExists(ctx, assetId);
  return listTagsForAsset(ctx, assetId);
}
