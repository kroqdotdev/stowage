import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  getTagIdsForAsset,
  listTagsForAsset,
  replaceAssetTags,
} from "./assetTags";
import {
  ASSET_STATUSES,
  type AssetCustomFieldValue,
  type AssetStatus,
  buildAssetTag,
  getAssetTagNumber,
  isCustomFieldValueEmpty,
  isCustomFieldValueSet,
  isIsoDateOnly,
  normalizeAssetNameKey,
  normalizeAssetNotes,
  normalizeAssetTagPrefix,
  normalizeCustomFieldValues,
  requireAssetName,
  throwAssetError,
} from "./assets_helpers";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";

const assetStatusValidator = v.union(
  v.literal("active"),
  v.literal("in_storage"),
  v.literal("under_repair"),
  v.literal("retired"),
  v.literal("disposed"),
);

const customFieldValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);
const customFieldValuesValidator = v.record(
  v.string(),
  customFieldValueValidator,
);

const optionalCategoryIdValidator = v.optional(
  v.union(v.id("categories"), v.null()),
);
const optionalLocationIdValidator = v.optional(
  v.union(v.id("locations"), v.null()),
);
const optionalStatusValidator = v.optional(assetStatusValidator);
const optionalSortByValidator = v.optional(
  v.union(
    v.literal("createdAt"),
    v.literal("name"),
    v.literal("assetTag"),
    v.literal("status"),
  ),
);
const optionalSortDirectionValidator = v.optional(
  v.union(v.literal("asc"), v.literal("desc")),
);

const assetTagPreviewValidator = v.object({
  assetTag: v.string(),
  prefix: v.string(),
  nextNumber: v.number(),
});

const categoryViewValidator = v.object({
  _id: v.id("categories"),
  name: v.string(),
  prefix: v.union(v.string(), v.null()),
  color: v.string(),
});

const locationViewValidator = v.object({
  _id: v.id("locations"),
  name: v.string(),
  parentId: v.union(v.id("locations"), v.null()),
  path: v.string(),
});

const tagViewValidator = v.object({
  _id: v.id("tags"),
  _creationTime: v.number(),
  name: v.string(),
  color: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const assetListItemValidator = v.object({
  _id: v.id("assets"),
  _creationTime: v.number(),
  name: v.string(),
  assetTag: v.string(),
  status: assetStatusValidator,
  categoryId: v.union(v.id("categories"), v.null()),
  categoryName: v.union(v.string(), v.null()),
  categoryColor: v.union(v.string(), v.null()),
  locationId: v.union(v.id("locations"), v.null()),
  locationPath: v.union(v.string(), v.null()),
  notes: v.union(v.string(), v.null()),
  tagIds: v.array(v.id("tags")),
  tagNames: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const assetDetailValidator = v.object({
  _id: v.id("assets"),
  _creationTime: v.number(),
  name: v.string(),
  assetTag: v.string(),
  status: assetStatusValidator,
  categoryId: v.union(v.id("categories"), v.null()),
  locationId: v.union(v.id("locations"), v.null()),
  notes: v.union(v.string(), v.null()),
  customFieldValues: customFieldValuesValidator,
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
  category: v.union(categoryViewValidator, v.null()),
  location: v.union(locationViewValidator, v.null()),
  tags: v.array(tagViewValidator),
});

type AssetRow = {
  _id: Id<"assets">;
  _creationTime: number;
  name: string;
  normalizedName: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: Id<"categories"> | null;
  locationId: Id<"locations"> | null;
  notes: string | null;
  customFieldValues: Record<string, AssetCustomFieldValue>;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
};

type CategoryRow = {
  _id: Id<"categories">;
  name: string;
  prefix: string | null;
  color: string;
};

type LocationRow = {
  _id: Id<"locations">;
  name: string;
  parentId: Id<"locations"> | null;
  path: string;
};

type TagRow = {
  _id: Id<"tags">;
  _creationTime: number;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

type FieldDefinitionRow = {
  _id: Id<"customFieldDefinitions">;
  name: string;
  fieldType:
    | "text"
    | "number"
    | "date"
    | "dropdown"
    | "checkbox"
    | "url"
    | "currency";
  options: string[];
  required: boolean;
  usageCount: number;
};

type AssetTagLinkRow = {
  _id: Id<"assetTags">;
  assetId: Id<"assets">;
  tagId: Id<"tags">;
};

type AttachmentRow = {
  _id: Id<"attachments">;
  assetId: Id<"assets">;
  storageId: Id<"_storage">;
  originalStorageId: Id<"_storage"> | null;
};

function isAssetStatus(value: string): value is AssetStatus {
  return (ASSET_STATUSES as readonly string[]).includes(value);
}

function normalizeTagFilter(tagIds: Id<"tags">[] | undefined) {
  if (!tagIds || tagIds.length === 0) {
    return [] as Id<"tags">[];
  }

  const seen = new Set<string>();
  const deduped: Id<"tags">[] = [];

  for (const tagId of tagIds) {
    const key = String(tagId);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(tagId);
  }

  return deduped;
}

function pickSort(
  sortBy: "createdAt" | "name" | "assetTag" | "status" | undefined,
  sortDirection: "asc" | "desc" | undefined,
) {
  const direction = sortDirection ?? "desc";
  const by = sortBy ?? "createdAt";

  const multiplier = direction === "asc" ? 1 : -1;

  return {
    by,
    direction,
    compare(
      a: Pick<AssetRow, "createdAt" | "name" | "assetTag" | "status">,
      b: Pick<AssetRow, "createdAt" | "name" | "assetTag" | "status">,
    ) {
      if (by === "createdAt") {
        return (a.createdAt - b.createdAt) * multiplier;
      }

      if (by === "name") {
        return (
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) *
          multiplier
        );
      }

      if (by === "assetTag") {
        return (
          a.assetTag.localeCompare(b.assetTag, undefined, {
            sensitivity: "base",
          }) * multiplier
        );
      }

      if (a.status === b.status) {
        return (a.createdAt - b.createdAt) * multiplier;
      }

      return (
        a.status.localeCompare(b.status, undefined, { sensitivity: "base" }) *
        multiplier
      );
    },
  };
}

async function requireCategory(
  ctx: QueryCtx | MutationCtx,
  categoryId: Id<"categories">,
) {
  const category = (await ctx.db.get(categoryId)) as CategoryRow | null;
  if (!category) {
    throwAssetError("CATEGORY_NOT_FOUND", "Category not found");
  }

  return category;
}

async function requireLocation(
  ctx: QueryCtx | MutationCtx,
  locationId: Id<"locations">,
) {
  const location = (await ctx.db.get(locationId)) as LocationRow | null;
  if (!location) {
    throwAssetError("LOCATION_NOT_FOUND", "Location not found");
  }

  return location;
}

async function requireAsset(
  ctx: QueryCtx | MutationCtx,
  assetId: Id<"assets">,
) {
  const asset = (await ctx.db.get(assetId)) as AssetRow | null;
  if (!asset) {
    throwAssetError("ASSET_NOT_FOUND", "Asset not found");
  }

  return asset;
}

async function getFieldDefinitions(ctx: QueryCtx | MutationCtx) {
  const definitions = (await ctx.db
    .query("customFieldDefinitions")
    .collect()) as FieldDefinitionRow[];
  return definitions;
}

async function getCategoryPrefix(
  ctx: QueryCtx | MutationCtx,
  categoryId: Id<"categories"> | null,
) {
  if (!categoryId) {
    return normalizeAssetTagPrefix(null);
  }

  const category = await requireCategory(ctx, categoryId);
  return normalizeAssetTagPrefix(category.prefix);
}

async function getNextAssetTagForPrefix(
  ctx: QueryCtx | MutationCtx,
  prefix: string,
) {
  const rows = (await ctx.db.query("assets").collect()) as AssetRow[];
  let maxNumber = 0;

  for (const row of rows) {
    const parsedNumber = getAssetTagNumber(row.assetTag, prefix);
    if (parsedNumber && parsedNumber > maxNumber) {
      maxNumber = parsedNumber;
    }
  }

  const nextNumber = maxNumber + 1;
  const assetTag = buildAssetTag(prefix, nextNumber);

  return { assetTag, prefix, nextNumber };
}

function normalizeStringCustomFieldValue(value: AssetCustomFieldValue) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throwAssetError(
      "INVALID_CUSTOM_FIELD_VALUE",
      "Custom field value must be text",
    );
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNumberCustomFieldValue(value: AssetCustomFieldValue) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throwAssetError(
      "INVALID_CUSTOM_FIELD_VALUE",
      "Custom field value must be numeric",
    );
  }

  return value;
}

function normalizeCheckboxCustomFieldValue(value: AssetCustomFieldValue) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "boolean") {
    throwAssetError(
      "INVALID_CUSTOM_FIELD_VALUE",
      "Custom field value must be true or false",
    );
  }

  return value;
}

function normalizeCustomValueByType(
  fieldDefinition: FieldDefinitionRow,
  value: AssetCustomFieldValue,
) {
  if (
    fieldDefinition.fieldType === "number" ||
    fieldDefinition.fieldType === "currency"
  ) {
    return normalizeNumberCustomFieldValue(value);
  }

  if (fieldDefinition.fieldType === "checkbox") {
    return normalizeCheckboxCustomFieldValue(value);
  }

  const normalized = normalizeStringCustomFieldValue(value);

  if (normalized === null) {
    return null;
  }

  if (fieldDefinition.fieldType === "date" && !isIsoDateOnly(normalized)) {
    throwAssetError(
      "INVALID_CUSTOM_FIELD_VALUE",
      `${fieldDefinition.name} must use YYYY-MM-DD format`,
    );
  }

  if (fieldDefinition.fieldType === "dropdown") {
    if (!fieldDefinition.options.includes(normalized)) {
      throwAssetError(
        "INVALID_CUSTOM_FIELD_VALUE",
        `${fieldDefinition.name} must be one of the configured options`,
      );
    }
  }

  if (fieldDefinition.fieldType === "url") {
    try {
      const parsedUrl = new URL(normalized);
      if (!parsedUrl.protocol.startsWith("http")) {
        throwAssetError(
          "INVALID_CUSTOM_FIELD_VALUE",
          `${fieldDefinition.name} must start with http:// or https://`,
        );
      }
    } catch {
      throwAssetError(
        "INVALID_CUSTOM_FIELD_VALUE",
        `${fieldDefinition.name} must be a valid URL`,
      );
    }
  }

  return normalized;
}

async function validateAndNormalizeCustomFieldValues(
  ctx: QueryCtx | MutationCtx,
  rawValues: Record<string, AssetCustomFieldValue> | undefined,
) {
  const normalizedInput = normalizeCustomFieldValues(rawValues);
  const definitions = await getFieldDefinitions(ctx);
  const definitionById = new Map(
    definitions.map((definition) => [String(definition._id), definition]),
  );

  const normalizedValues: Record<string, AssetCustomFieldValue> = {};

  for (const [fieldId, rawValue] of Object.entries(normalizedInput)) {
    const definition = definitionById.get(fieldId);
    if (!definition) {
      throwAssetError(
        "INVALID_CUSTOM_FIELD",
        "Custom field definition not found",
      );
    }

    const normalizedValue = normalizeCustomValueByType(definition, rawValue);
    if (normalizedValue !== null) {
      normalizedValues[fieldId] = normalizedValue;
    }
  }

  for (const definition of definitions) {
    if (!definition.required) {
      continue;
    }

    const fieldId = String(definition._id);
    const value = normalizedValues[fieldId];

    if (definition.fieldType === "checkbox") {
      if (value === null || value === undefined) {
        throwAssetError(
          "REQUIRED_CUSTOM_FIELD",
          `${definition.name} is required`,
        );
      }
      continue;
    }

    if (isCustomFieldValueEmpty(value)) {
      throwAssetError(
        "REQUIRED_CUSTOM_FIELD",
        `${definition.name} is required`,
      );
    }
  }

  return normalizedValues;
}

function getUsedFieldIds(values: Record<string, AssetCustomFieldValue>) {
  const usedFieldIds = new Set<string>();

  for (const [fieldId, value] of Object.entries(values)) {
    if (isCustomFieldValueSet(value)) {
      usedFieldIds.add(fieldId);
    }
  }

  return usedFieldIds;
}

async function updateFieldUsageCounts(
  ctx: MutationCtx,
  previousValues: Record<string, AssetCustomFieldValue>,
  nextValues: Record<string, AssetCustomFieldValue>,
) {
  const previousUsed = getUsedFieldIds(previousValues);
  const nextUsed = getUsedFieldIds(nextValues);

  const updates: Promise<void>[] = [];

  for (const fieldId of previousUsed) {
    if (nextUsed.has(fieldId)) {
      continue;
    }

    const fieldDefinitionId = fieldId as Id<"customFieldDefinitions">;
    updates.push(
      (async () => {
        const definition = (await ctx.db.get(
          fieldDefinitionId,
        )) as FieldDefinitionRow | null;
        if (!definition) {
          return;
        }

        await ctx.db.patch(fieldDefinitionId, {
          usageCount: Math.max(0, definition.usageCount - 1),
        });
      })(),
    );
  }

  for (const fieldId of nextUsed) {
    if (previousUsed.has(fieldId)) {
      continue;
    }

    const fieldDefinitionId = fieldId as Id<"customFieldDefinitions">;
    updates.push(
      (async () => {
        const definition = (await ctx.db.get(
          fieldDefinitionId,
        )) as FieldDefinitionRow | null;
        if (!definition) {
          return;
        }

        await ctx.db.patch(fieldDefinitionId, {
          usageCount: definition.usageCount + 1,
        });
      })(),
    );
  }

  await Promise.all(updates);
}

type AssetListFilterArgs = {
  categoryId: Id<"categories"> | null | undefined;
  status: AssetStatus | undefined;
  locationId: Id<"locations"> | null | undefined;
  tagIds: Id<"tags">[] | undefined;
};

type AssetListView = {
  _id: Id<"assets">;
  _creationTime: number;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: Id<"categories"> | null;
  categoryName: string | null;
  categoryColor: string | null;
  locationId: Id<"locations"> | null;
  locationPath: string | null;
  notes: string | null;
  tagIds: Id<"tags">[];
  tagNames: string[];
  createdAt: number;
  updatedAt: number;
};

const TAG_ONLY_DIRECT_FETCH_LIMIT = 200;
const ASSET_LINKS_PER_ASSET_QUERY_LIMIT = 120;

async function getIntersectedAssetIdsForTags(
  ctx: QueryCtx,
  tagIds: Id<"tags">[],
) {
  if (tagIds.length === 0) {
    return null as Set<Id<"assets">> | null;
  }

  const tagAssetSets = await Promise.all(
    tagIds.map(async (tagId) => {
      const links = (await ctx.db
        .query("assetTags")
        .withIndex("by_tagId", (q) => q.eq("tagId", tagId))
        .collect()) as AssetTagLinkRow[];

      return new Set(links.map((link) => link.assetId));
    }),
  );

  const [firstSet, ...restSets] = tagAssetSets;
  if (!firstSet) {
    return new Set<Id<"assets">>();
  }

  const intersected = new Set(firstSet);
  for (const nextSet of restSets) {
    for (const assetId of intersected) {
      if (!nextSet.has(assetId)) {
        intersected.delete(assetId);
      }
    }
  }

  return intersected;
}

async function queryAssetsByPrimaryFilter(
  ctx: QueryCtx,
  args: AssetListFilterArgs,
  tagAssetIds: Set<Id<"assets">> | null,
) {
  if (args.categoryId !== undefined) {
    return (await ctx.db
      .query("assets")
      .withIndex("by_categoryId", (q) =>
        q.eq("categoryId", args.categoryId ?? null),
      )
      .collect()) as AssetRow[];
  }

  if (args.locationId !== undefined) {
    return (await ctx.db
      .query("assets")
      .withIndex("by_locationId", (q) =>
        q.eq("locationId", args.locationId ?? null),
      )
      .collect()) as AssetRow[];
  }

  if (args.status !== undefined) {
    const status = args.status;
    return (await ctx.db
      .query("assets")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect()) as AssetRow[];
  }

  if (
    tagAssetIds &&
    tagAssetIds.size > 0 &&
    tagAssetIds.size <= TAG_ONLY_DIRECT_FETCH_LIMIT
  ) {
    const rows = await Promise.all(
      Array.from(tagAssetIds).map((assetId) => ctx.db.get(assetId)),
    );
    return rows.filter(Boolean) as AssetRow[];
  }

  return (await ctx.db
    .query("assets")
    .withIndex("by_createdAt", (q) => q)
    .collect()) as AssetRow[];
}

async function listAssetRowsByFilters(
  ctx: QueryCtx,
  args: AssetListFilterArgs,
) {
  const normalizedTagIds = normalizeTagFilter(args.tagIds);
  const tagAssetIds = await getIntersectedAssetIdsForTags(
    ctx,
    normalizedTagIds,
  );

  if (normalizedTagIds.length > 0 && (!tagAssetIds || tagAssetIds.size === 0)) {
    return [] as AssetRow[];
  }

  const rows = await queryAssetsByPrimaryFilter(ctx, args, tagAssetIds);

  return rows.filter((row) => {
    if (
      args.categoryId !== undefined &&
      (args.categoryId ?? null) !== row.categoryId
    ) {
      return false;
    }

    if (args.status !== undefined && args.status !== row.status) {
      return false;
    }

    if (
      args.locationId !== undefined &&
      (args.locationId ?? null) !== row.locationId
    ) {
      return false;
    }

    if (
      normalizedTagIds.length > 0 &&
      tagAssetIds &&
      !tagAssetIds.has(row._id)
    ) {
      return false;
    }

    return true;
  });
}

async function buildAssetListViews(ctx: QueryCtx, assetRows: AssetRow[]) {
  if (assetRows.length === 0) {
    return [] as AssetListView[];
  }

  const categoryIds = Array.from(
    new Set(
      assetRows
        .map((asset) => asset.categoryId)
        .filter(
          (categoryId): categoryId is Id<"categories"> => categoryId !== null,
        ),
    ),
  );
  const locationIds = Array.from(
    new Set(
      assetRows
        .map((asset) => asset.locationId)
        .filter(
          (locationId): locationId is Id<"locations"> => locationId !== null,
        ),
    ),
  );

  const [categoryRows, locationRows] = await Promise.all([
    Promise.all(categoryIds.map((categoryId) => ctx.db.get(categoryId))),
    Promise.all(locationIds.map((locationId) => ctx.db.get(locationId))),
  ]);

  const categoryById = new Map<Id<"categories">, CategoryRow>();
  for (const row of categoryRows) {
    if (row) {
      categoryById.set(row._id as Id<"categories">, row as CategoryRow);
    }
  }

  const locationById = new Map<Id<"locations">, LocationRow>();
  for (const row of locationRows) {
    if (row) {
      locationById.set(row._id as Id<"locations">, row as LocationRow);
    }
  }

  const assetIds = new Set(assetRows.map((asset) => asset._id));
  const assetTagLinks =
    assetRows.length <= ASSET_LINKS_PER_ASSET_QUERY_LIMIT
      ? (
          await Promise.all(
            assetRows.map((asset) =>
              ctx.db
                .query("assetTags")
                .withIndex("by_assetId", (q) => q.eq("assetId", asset._id))
                .collect(),
            ),
          )
        ).flat()
      : (await ctx.db.query("assetTags").collect()).filter((link) =>
          assetIds.has((link as AssetTagLinkRow).assetId),
        );

  const links = assetTagLinks as AssetTagLinkRow[];
  const tagIdsByAssetId = new Map<Id<"assets">, Id<"tags">[]>();
  for (const link of links) {
    const existing = tagIdsByAssetId.get(link.assetId);
    if (existing) {
      existing.push(link.tagId);
    } else {
      tagIdsByAssetId.set(link.assetId, [link.tagId]);
    }
  }

  const tagIds = Array.from(new Set(links.map((link) => link.tagId)));
  const tagRows = await Promise.all(tagIds.map((tagId) => ctx.db.get(tagId)));

  const tagById = new Map<Id<"tags">, TagRow>();
  for (const row of tagRows) {
    if (row) {
      tagById.set(row._id as Id<"tags">, row as TagRow);
    }
  }

  return assetRows.map((asset) => {
    const category = asset.categoryId
      ? (categoryById.get(asset.categoryId) ?? null)
      : null;
    const location = asset.locationId
      ? (locationById.get(asset.locationId) ?? null)
      : null;
    const tagIdsForAsset = (tagIdsByAssetId.get(asset._id) ?? []).slice();
    const tagNames = tagIdsForAsset
      .map((tagId) => tagById.get(tagId)?.name ?? null)
      .filter((name): name is string => Boolean(name))
      .sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: "base" }),
      );

    return {
      _id: asset._id,
      _creationTime: asset._creationTime,
      name: asset.name,
      assetTag: asset.assetTag,
      status: asset.status,
      categoryId: asset.categoryId,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      locationId: asset.locationId,
      locationPath: location?.path ?? null,
      notes: asset.notes,
      tagIds: tagIdsForAsset,
      tagNames,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  });
}

function matchesAssetSearch(
  row: Pick<AssetListView, "name" | "assetTag" | "notes" | "tagNames">,
  normalizedSearch: string,
) {
  if (!normalizedSearch) {
    return true;
  }

  return [row.name, row.assetTag, row.notes ?? "", ...row.tagNames].some(
    (value) => value.toLocaleLowerCase().includes(normalizedSearch),
  );
}

export const generateAssetTag = query({
  args: {
    categoryId: optionalCategoryIdValidator,
  },
  returns: assetTagPreviewValidator,
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const categoryId = args.categoryId ?? null;
    const prefix = await getCategoryPrefix(ctx, categoryId);
    return getNextAssetTagForPrefix(ctx, prefix);
  },
});

export const createAsset = mutation({
  args: {
    name: v.string(),
    categoryId: optionalCategoryIdValidator,
    locationId: optionalLocationIdValidator,
    status: optionalStatusValidator,
    notes: v.optional(v.union(v.string(), v.null())),
    customFieldValues: v.optional(customFieldValuesValidator),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  returns: v.object({ assetId: v.id("assets") }),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);

    const name = requireAssetName(args.name);
    const normalizedName = normalizeAssetNameKey(name);
    const categoryId = args.categoryId ?? null;
    const locationId = args.locationId ?? null;

    if (categoryId) {
      await requireCategory(ctx, categoryId);
    }

    if (locationId) {
      await requireLocation(ctx, locationId);
    }

    const status = (args.status ?? "active") as AssetStatus;
    if (!isAssetStatus(status)) {
      throwAssetError("INVALID_ASSET_STATUS", "Invalid asset status");
    }

    const notes = normalizeAssetNotes(args.notes);
    const customFieldValues = await validateAndNormalizeCustomFieldValues(
      ctx,
      args.customFieldValues,
    );

    const prefix = await getCategoryPrefix(ctx, categoryId);
    const tagPreview = await getNextAssetTagForPrefix(ctx, prefix);

    const now = Date.now();
    const assetId = await ctx.db.insert("assets", {
      name,
      normalizedName,
      assetTag: tagPreview.assetTag,
      status,
      categoryId,
      locationId,
      notes,
      customFieldValues,
      createdBy: actor._id as Id<"users">,
      updatedBy: actor._id as Id<"users">,
      createdAt: now,
      updatedAt: now,
    });

    await replaceAssetTags(ctx, {
      assetId,
      tagIds: args.tagIds ?? [],
      actorId: actor._id as Id<"users">,
    });

    await updateFieldUsageCounts(ctx, {}, customFieldValues);

    return { assetId };
  },
});

export const getAsset = query({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.union(assetDetailValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const asset = (await ctx.db.get(args.assetId)) as AssetRow | null;
    if (!asset) {
      return null;
    }

    const [category, location, tags] = await Promise.all([
      asset.categoryId ? ctx.db.get(asset.categoryId) : Promise.resolve(null),
      asset.locationId ? ctx.db.get(asset.locationId) : Promise.resolve(null),
      listTagsForAsset(ctx, asset._id),
    ]);

    return {
      _id: asset._id,
      _creationTime: asset._creationTime,
      name: asset.name,
      assetTag: asset.assetTag,
      status: asset.status,
      categoryId: asset.categoryId,
      locationId: asset.locationId,
      notes: asset.notes,
      customFieldValues: asset.customFieldValues,
      createdBy: asset.createdBy,
      updatedBy: asset.updatedBy,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      category: category
        ? {
            _id: category._id as Id<"categories">,
            name: String((category as CategoryRow).name),
            prefix: ((category as CategoryRow).prefix ?? null) as string | null,
            color: String((category as CategoryRow).color),
          }
        : null,
      location: location
        ? {
            _id: location._id as Id<"locations">,
            name: String((location as LocationRow).name),
            parentId: ((location as LocationRow).parentId ??
              null) as Id<"locations"> | null,
            path: String((location as LocationRow).path),
          }
        : null,
      tags,
    };
  },
});

export const listAssets = query({
  args: {
    categoryId: optionalCategoryIdValidator,
    status: optionalStatusValidator,
    locationId: optionalLocationIdValidator,
    tagIds: v.optional(v.array(v.id("tags"))),
    search: v.optional(v.string()),
    sortBy: optionalSortByValidator,
    sortDirection: optionalSortDirectionValidator,
  },
  returns: v.array(assetListItemValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const normalizedSearch = args.search?.trim().toLocaleLowerCase() ?? "";
    const sort = pickSort(args.sortBy, args.sortDirection);

    const filteredAssets = await listAssetRowsByFilters(ctx, {
      categoryId: args.categoryId,
      status: args.status,
      locationId: args.locationId,
      tagIds: args.tagIds,
    });
    const rows = await buildAssetListViews(ctx, filteredAssets);

    return rows
      .filter((row) => matchesAssetSearch(row, normalizedSearch))
      .sort((left, right) => sort.compare(left, right));
  },
});

export const searchAssets = query({
  args: {
    query: v.string(),
    categoryId: optionalCategoryIdValidator,
    status: optionalStatusValidator,
    locationId: optionalLocationIdValidator,
    tagIds: v.optional(v.array(v.id("tags"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(assetListItemValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const normalizedQuery = args.query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
    const filteredAssets = await listAssetRowsByFilters(ctx, {
      categoryId: args.categoryId,
      status: args.status,
      locationId: args.locationId,
      tagIds: args.tagIds,
    });
    const rows = await buildAssetListViews(ctx, filteredAssets);

    return rows
      .filter((row) => matchesAssetSearch(row, normalizedQuery))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

export const updateAsset = mutation({
  args: {
    assetId: v.id("assets"),
    name: v.optional(v.string()),
    categoryId: optionalCategoryIdValidator,
    locationId: optionalLocationIdValidator,
    status: optionalStatusValidator,
    notes: v.optional(v.union(v.string(), v.null())),
    customFieldValues: v.optional(customFieldValuesValidator),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    const asset = await requireAsset(ctx, args.assetId);

    const name =
      args.name === undefined ? asset.name : requireAssetName(args.name);
    const normalizedName = normalizeAssetNameKey(name);
    const categoryId =
      args.categoryId === undefined
        ? asset.categoryId
        : (args.categoryId ?? null);
    const locationId =
      args.locationId === undefined
        ? asset.locationId
        : (args.locationId ?? null);
    const status = (args.status ?? asset.status) as AssetStatus;

    if (!isAssetStatus(status)) {
      throwAssetError("INVALID_ASSET_STATUS", "Invalid asset status");
    }

    if (categoryId) {
      await requireCategory(ctx, categoryId);
    }

    if (locationId) {
      await requireLocation(ctx, locationId);
    }

    const notes =
      args.notes === undefined ? asset.notes : normalizeAssetNotes(args.notes);
    const customFieldValues =
      args.customFieldValues === undefined
        ? asset.customFieldValues
        : await validateAndNormalizeCustomFieldValues(
            ctx,
            args.customFieldValues,
          );

    await ctx.db.patch(asset._id, {
      name,
      normalizedName,
      categoryId,
      locationId,
      status,
      notes,
      customFieldValues,
      updatedBy: actor._id as Id<"users">,
      updatedAt: Date.now(),
    });

    if (args.tagIds !== undefined) {
      await replaceAssetTags(ctx, {
        assetId: asset._id,
        tagIds: args.tagIds,
        actorId: actor._id as Id<"users">,
      });
    }

    await updateFieldUsageCounts(
      ctx,
      asset.customFieldValues,
      customFieldValues,
    );

    return null;
  },
});

export const updateAssetStatus = mutation({
  args: {
    assetId: v.id("assets"),
    status: assetStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    const asset = await requireAsset(ctx, args.assetId);

    if (asset.status === args.status) {
      return null;
    }

    await ctx.db.patch(args.assetId, {
      status: args.status,
      updatedBy: actor._id as Id<"users">,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteAsset = mutation({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const asset = await requireAsset(ctx, args.assetId);
    await updateFieldUsageCounts(ctx, asset.customFieldValues, {});

    const links = await ctx.db
      .query("assetTags")
      .withIndex("by_assetId", (q) => q.eq("assetId", asset._id))
      .collect();

    await Promise.all(
      links.map((link) => ctx.db.delete(link._id as Id<"assetTags">)),
    );

    const attachments = (await ctx.db
      .query("attachments")
      .withIndex("by_assetId", (q) => q.eq("assetId", asset._id))
      .collect()) as AttachmentRow[];

    await Promise.all(
      attachments.map(async (attachment) => {
        await ctx.db.delete(attachment._id);

        const storageIds = Array.from(
          new Set(
            [attachment.storageId, attachment.originalStorageId].filter(
              (storageId): storageId is Id<"_storage"> => storageId !== null,
            ),
          ),
        );

        await Promise.all(
          storageIds.map(async (storageId) => {
            try {
              await ctx.storage.delete(storageId);
            } catch {
              // File may have already been removed by optimizer cleanup.
            }
          }),
        );
      }),
    );

    await ctx.db.delete(asset._id);

    return null;
  },
});

export const getAssetFilterOptions = query({
  args: {},
  returns: v.object({
    categories: v.array(categoryViewValidator),
    locations: v.array(locationViewValidator),
    tags: v.array(tagViewValidator),
  }),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const [categories, locations, tags] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db.query("locations").collect(),
      ctx.db.query("tags").collect(),
    ]);

    const sortedCategories = (categories as CategoryRow[])
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map((category) => ({
        _id: category._id,
        name: category.name,
        prefix: category.prefix,
        color: category.color,
      }));

    const sortedLocations = (locations as LocationRow[])
      .slice()
      .sort((a, b) =>
        a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
      )
      .map((location) => ({
        _id: location._id,
        name: location.name,
        parentId: location.parentId,
        path: location.path,
      }));

    const sortedTags = (tags as TagRow[])
      .slice()
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

    return {
      categories: sortedCategories,
      locations: sortedLocations,
      tags: sortedTags,
    };
  },
});

export const getDashboardStats = query({
  args: {},
  returns: v.object({
    totalAssets: v.number(),
    totalCategories: v.number(),
    totalLocations: v.number(),
    statusBreakdown: v.array(
      v.object({ status: assetStatusValidator, count: v.number() }),
    ),
    recentAssets: v.array(
      v.object({
        _id: v.id("assets"),
        name: v.string(),
        assetTag: v.string(),
        status: assetStatusValidator,
        createdAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const [allAssets, categories, locations] = await Promise.all([
      ctx.db.query("assets").collect() as Promise<AssetRow[]>,
      ctx.db.query("categories").collect(),
      ctx.db.query("locations").collect(),
    ]);

    const statusCounts = new Map<AssetStatus, number>();
    for (const asset of allAssets) {
      statusCounts.set(asset.status, (statusCounts.get(asset.status) ?? 0) + 1);
    }

    const statusBreakdown = ASSET_STATUSES.filter((s) =>
      statusCounts.has(s),
    ).map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    }));

    const recentAssets = allAssets
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((asset) => ({
        _id: asset._id,
        name: asset.name,
        assetTag: asset.assetTag,
        status: asset.status,
        createdAt: asset.createdAt,
      }));

    return {
      totalAssets: allAssets.length,
      totalCategories: categories.length,
      totalLocations: locations.length,
      statusBreakdown,
      recentAssets,
    };
  },
});

export const getAssetTagIds = query({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.array(v.id("tags")),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireAsset(ctx, args.assetId);
    return getTagIdsForAsset(ctx, args.assetId);
  },
});
