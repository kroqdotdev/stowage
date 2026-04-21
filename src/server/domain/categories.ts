import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import {
  normalizeCatalogNameKey,
  normalizeHexColor,
  normalizeOptionalText,
  normalizePrefix,
  requireCatalogName,
} from "@/server/pb/catalog";
import type { Ctx } from "@/server/pb/context";
import { ConflictError, NotFoundError } from "@/server/pb/errors";

export const CreateCategoryInput = z.object({
  name: z.string(),
  prefix: z.string().nullish(),
  description: z.string().nullish(),
  color: z.string(),
});

export const UpdateCategoryInput = z.object({
  categoryId: z.string(),
  name: z.string(),
  prefix: z.string().nullish(),
  description: z.string().nullish(),
  color: z.string(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInput>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInput>;

export type CategoryView = {
  id: string;
  name: string;
  prefix: string | null;
  description: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
};

type CategoryRecord = {
  id: string;
  name: string;
  normalizedName: string;
  prefix: string;
  description: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

function toCategoryView(record: CategoryRecord): CategoryView {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix || null,
    description: record.description || null,
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

export async function listCategories(ctx: Ctx): Promise<CategoryView[]> {
  // PB's SQL sort is lexicographic (uppercase before lowercase), so mixed-case
  // names would come back in the wrong order. Sort in JS with
  // localeCompare(..., { sensitivity: "base" }) instead.
  const records = await ctx.pb
    .collection("categories")
    .getFullList<CategoryRecord>();
  return records
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
    .map(toCategoryView);
}

export async function createCategory(
  ctx: Ctx,
  input: CreateCategoryInput,
): Promise<CategoryView> {
  const parsed = CreateCategoryInput.parse(input);

  const name = requireCatalogName(parsed.name);
  const normalizedName = normalizeCatalogNameKey(name);
  const prefix = normalizePrefix(parsed.prefix ?? null);
  const description = normalizeOptionalText(parsed.description ?? null);
  const color = normalizeHexColor(parsed.color);
  const now = Date.now();

  try {
    const record = await ctx.pb
      .collection("categories")
      .create<CategoryRecord>({
        name,
        normalizedName,
        prefix: prefix ?? "",
        description: description ?? "",
        color,
        createdAt: now,
        updatedAt: now,
      });
    return toCategoryView(record);
  } catch (error) {
    if (isDuplicateNameError(error)) {
      throw new ConflictError("A category with this name already exists");
    }
    throw error;
  }
}

export async function updateCategory(
  ctx: Ctx,
  input: UpdateCategoryInput,
): Promise<CategoryView> {
  const parsed = UpdateCategoryInput.parse(input);
  const name = requireCatalogName(parsed.name);
  const normalizedName = normalizeCatalogNameKey(name);
  const prefix = normalizePrefix(parsed.prefix ?? null);
  const description = normalizeOptionalText(parsed.description ?? null);
  const color = normalizeHexColor(parsed.color);

  try {
    const record = await ctx.pb
      .collection("categories")
      .update<CategoryRecord>(parsed.categoryId, {
        name,
        normalizedName,
        prefix: prefix ?? "",
        description: description ?? "",
        color,
        updatedAt: Date.now(),
      });
    return toCategoryView(record);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Category not found");
    }
    if (isDuplicateNameError(error)) {
      throw new ConflictError("A category with this name already exists");
    }
    throw error;
  }
}

export async function deleteCategory(
  ctx: Ctx,
  categoryId: string,
): Promise<void> {
  try {
    await ctx.pb.collection("categories").getOne(categoryId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Category not found");
    }
    throw error;
  }

  const linked = await ctx.pb.collection("assets").getList(1, 1, {
    filter: `categoryId = "${categoryId}"`,
  });
  if (linked.totalItems > 0) {
    throw new ConflictError(
      "Cannot delete a category that is assigned to assets",
    );
  }

  await ctx.pb.collection("categories").delete(categoryId);
}
