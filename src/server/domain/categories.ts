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
import { ConflictError } from "@/server/pb/errors";

export const CreateCategoryInput = z.object({
  name: z.string(),
  prefix: z.string().nullish(),
  description: z.string().nullish(),
  color: z.string(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInput>;

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

export async function listCategories(ctx: Ctx): Promise<CategoryView[]> {
  // Match Convex's localeCompare(..., { sensitivity: "base" }) — PB's SQL sort
  // is lexicographic (uppercase before lowercase), which produces the wrong
  // order for mixed-case names.
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
    if (
      error instanceof ClientResponseError &&
      error.status === 400 &&
      JSON.stringify(error.data ?? {}).includes("normalizedName")
    ) {
      throw new ConflictError("A category with this name already exists");
    }
    throw error;
  }
}
