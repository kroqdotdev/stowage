import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  ASSET_STATUSES,
  type AssetCustomFieldValue,
  type AssetStatus,
  buildAssetTag,
  getAssetTagNumber,
  getUsedFieldIds,
  isCustomFieldValueEmpty,
  isIsoDateOnly,
  normalizeAssetNameKey,
  normalizeAssetNotes,
  normalizeAssetTagPrefix,
  normalizeCustomFieldValues,
  requireAssetName,
} from "@/server/pb/assets";
import {
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  getTagIdsForAsset,
  listTagsForAsset,
  replaceAssetTags,
  type AssetTagView,
} from "./assetTags";

const assetStatusSchema = z.enum(ASSET_STATUSES);
const customFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const customFieldValuesSchema = z.record(z.string(), customFieldValueSchema);

const NullableId = z.string().nullish();

export const CreateAssetInput = z.object({
  name: z.string(),
  categoryId: NullableId,
  locationId: NullableId,
  serviceGroupId: NullableId,
  status: assetStatusSchema.optional(),
  notes: z.string().nullish(),
  customFieldValues: customFieldValuesSchema.optional(),
  tagIds: z.array(z.string()).optional(),
  actorId: z.string(),
});

export const UpdateAssetInput = z.object({
  assetId: z.string(),
  name: z.string().optional(),
  categoryId: NullableId,
  locationId: NullableId,
  serviceGroupId: NullableId,
  status: assetStatusSchema.optional(),
  notes: z.string().nullish(),
  customFieldValues: customFieldValuesSchema.optional(),
  tagIds: z.array(z.string()).optional(),
  actorId: z.string(),
});

export const UpdateAssetStatusInput = z.object({
  assetId: z.string(),
  status: assetStatusSchema,
  actorId: z.string(),
});

export const ListAssetsInput = z.object({
  categoryId: NullableId,
  locationId: NullableId,
  status: assetStatusSchema.optional(),
  tagIds: z.array(z.string()).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "name", "assetTag", "status"])
    .optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetInput>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetInput>;
export type UpdateAssetStatusInput = z.infer<typeof UpdateAssetStatusInput>;
export type ListAssetsInput = z.infer<typeof ListAssetsInput>;

export type AssetTagPreview = {
  assetTag: string;
  prefix: string;
  nextNumber: number;
};

export type AssetListView = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  locationId: string | null;
  locationPath: string | null;
  serviceGroupId: string | null;
  notes: string | null;
  tagIds: string[];
  tagNames: string[];
  createdAt: number;
  updatedAt: number;
};

export type AssetDetailView = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: string | null;
  locationId: string | null;
  serviceGroupId: string | null;
  notes: string | null;
  customFieldValues: Record<string, AssetCustomFieldValue>;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
  category: {
    id: string;
    name: string;
    prefix: string | null;
    color: string;
  } | null;
  location: {
    id: string;
    name: string;
    parentId: string | null;
    path: string;
  } | null;
  serviceGroup: { id: string; name: string } | null;
  tags: AssetTagView[];
};

type AssetRecord = {
  id: string;
  name: string;
  normalizedName: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: string;
  locationId: string;
  serviceGroupId?: string;
  notes: string;
  customFieldValues: Record<string, AssetCustomFieldValue> | null;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
};

type CategoryRecord = {
  id: string;
  name: string;
  prefix: string;
  color: string;
};

type LocationRecord = {
  id: string;
  name: string;
  parentId: string;
  path: string;
};

type ServiceGroupRecord = {
  id: string;
  name: string;
};

type FieldDefinitionRecord = {
  id: string;
  name: string;
  fieldType:
    | "text"
    | "number"
    | "date"
    | "dropdown"
    | "checkbox"
    | "url"
    | "currency";
  options: string[] | null;
  required: boolean;
  usageCount: number;
};

function escapeFilter(value: string) {
  return value.replace(/"/g, '\\"');
}

async function loadAsset(ctx: Ctx, assetId: string): Promise<AssetRecord> {
  try {
    return await ctx.pb.collection("assets").getOne<AssetRecord>(assetId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Asset not found");
    }
    throw error;
  }
}

async function requireCategory(
  ctx: Ctx,
  categoryId: string,
): Promise<CategoryRecord> {
  try {
    return await ctx.pb
      .collection("categories")
      .getOne<CategoryRecord>(categoryId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new ValidationError("Category not found");
    }
    throw error;
  }
}

async function requireLocation(
  ctx: Ctx,
  locationId: string,
): Promise<LocationRecord> {
  try {
    return await ctx.pb
      .collection("locations")
      .getOne<LocationRecord>(locationId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new ValidationError("Location not found");
    }
    throw error;
  }
}

async function requireServiceGroup(
  ctx: Ctx,
  serviceGroupId: string,
): Promise<ServiceGroupRecord> {
  try {
    return await ctx.pb
      .collection("serviceGroups")
      .getOne<ServiceGroupRecord>(serviceGroupId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new ValidationError("Service group not found");
    }
    throw error;
  }
}

async function getCategoryPrefix(
  ctx: Ctx,
  categoryId: string | null,
): Promise<string> {
  if (!categoryId) return normalizeAssetTagPrefix(null);
  const category = await requireCategory(ctx, categoryId);
  return normalizeAssetTagPrefix(category.prefix);
}

async function getNextAssetTagForPrefix(
  ctx: Ctx,
  prefix: string,
): Promise<AssetTagPreview> {
  const rows = await ctx.pb
    .collection("assets")
    .getFullList<AssetRecord>();
  let maxNumber = 0;
  for (const row of rows) {
    const n = getAssetTagNumber(row.assetTag, prefix);
    if (n && n > maxNumber) maxNumber = n;
  }
  const nextNumber = maxNumber + 1;
  return { assetTag: buildAssetTag(prefix, nextNumber), prefix, nextNumber };
}

function normalizeStringCustomFieldValue(value: AssetCustomFieldValue) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ValidationError("Custom field value must be text");
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNumberCustomFieldValue(value: AssetCustomFieldValue) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError("Custom field value must be numeric");
  }
  return value;
}

function normalizeCheckboxCustomFieldValue(value: AssetCustomFieldValue) {
  if (value === null) return null;
  if (typeof value !== "boolean") {
    throw new ValidationError("Custom field value must be true or false");
  }
  return value;
}

function normalizeCustomValueByType(
  definition: FieldDefinitionRecord,
  value: AssetCustomFieldValue,
): AssetCustomFieldValue {
  if (
    definition.fieldType === "number" ||
    definition.fieldType === "currency"
  ) {
    return normalizeNumberCustomFieldValue(value);
  }
  if (definition.fieldType === "checkbox") {
    return normalizeCheckboxCustomFieldValue(value);
  }
  const normalized = normalizeStringCustomFieldValue(value);
  if (normalized === null) return null;

  if (definition.fieldType === "date" && !isIsoDateOnly(normalized)) {
    throw new ValidationError(
      `${definition.name} must use YYYY-MM-DD format`,
    );
  }
  if (definition.fieldType === "dropdown") {
    const options = definition.options ?? [];
    if (!options.includes(normalized)) {
      throw new ValidationError(
        `${definition.name} must be one of the configured options`,
      );
    }
  }
  if (definition.fieldType === "url") {
    try {
      const parsed = new URL(normalized);
      if (!parsed.protocol.startsWith("http")) {
        throw new ValidationError(
          `${definition.name} must start with http:// or https://`,
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(`${definition.name} must be a valid URL`);
    }
  }
  return normalized;
}

async function validateAndNormalizeCustomFieldValues(
  ctx: Ctx,
  rawValues: Record<string, AssetCustomFieldValue> | undefined,
): Promise<Record<string, AssetCustomFieldValue>> {
  const input = normalizeCustomFieldValues(rawValues);
  const definitions = await ctx.pb
    .collection("customFieldDefinitions")
    .getFullList<FieldDefinitionRecord>();
  const byId = new Map(definitions.map((d) => [d.id, d]));

  const normalized: Record<string, AssetCustomFieldValue> = {};
  for (const [fieldId, rawValue] of Object.entries(input)) {
    const definition = byId.get(fieldId);
    if (!definition) {
      throw new ValidationError("Custom field definition not found");
    }
    const nextValue = normalizeCustomValueByType(definition, rawValue);
    if (nextValue !== null) normalized[fieldId] = nextValue;
  }

  for (const definition of definitions) {
    if (!definition.required) continue;
    const value = normalized[definition.id];
    if (definition.fieldType === "checkbox") {
      if (value === null || value === undefined) {
        throw new ValidationError(`${definition.name} is required`);
      }
      continue;
    }
    if (isCustomFieldValueEmpty(value)) {
      throw new ValidationError(`${definition.name} is required`);
    }
  }

  return normalized;
}

async function updateFieldUsageCounts(
  ctx: Ctx,
  previous: Record<string, AssetCustomFieldValue>,
  next: Record<string, AssetCustomFieldValue>,
) {
  const previousUsed = getUsedFieldIds(previous);
  const nextUsed = getUsedFieldIds(next);

  for (const fieldId of previousUsed) {
    if (nextUsed.has(fieldId)) continue;
    try {
      const definition = await ctx.pb
        .collection("customFieldDefinitions")
        .getOne<FieldDefinitionRecord>(fieldId);
      await ctx.pb
        .collection("customFieldDefinitions")
        .update(fieldId, {
          usageCount: Math.max(0, definition.usageCount - 1),
        });
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  for (const fieldId of nextUsed) {
    if (previousUsed.has(fieldId)) continue;
    try {
      const definition = await ctx.pb
        .collection("customFieldDefinitions")
        .getOne<FieldDefinitionRecord>(fieldId);
      await ctx.pb
        .collection("customFieldDefinitions")
        .update(fieldId, { usageCount: definition.usageCount + 1 });
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }
}

function pickSort(
  sortBy: ListAssetsInput["sortBy"],
  sortDirection: ListAssetsInput["sortDirection"],
) {
  const direction = sortDirection ?? "desc";
  const by = sortBy ?? "createdAt";
  const multiplier = direction === "asc" ? 1 : -1;
  return (a: AssetListView, b: AssetListView) => {
    if (by === "createdAt") return (a.createdAt - b.createdAt) * multiplier;
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
  };
}

async function buildAssetListViews(
  ctx: Ctx,
  rows: AssetRecord[],
): Promise<AssetListView[]> {
  if (rows.length === 0) return [];
  const categoryIds = [
    ...new Set(rows.map((row) => row.categoryId).filter((id) => !!id)),
  ];
  const locationIds = [
    ...new Set(rows.map((row) => row.locationId).filter((id) => !!id)),
  ];

  const [categories, locations, tagLinks, tags] = await Promise.all([
    Promise.all(
      categoryIds.map((id) =>
        ctx.pb
          .collection("categories")
          .getOne<CategoryRecord>(id)
          .catch(() => null),
      ),
    ),
    Promise.all(
      locationIds.map((id) =>
        ctx.pb
          .collection("locations")
          .getOne<LocationRecord>(id)
          .catch(() => null),
      ),
    ),
    ctx.pb
      .collection("assetTags")
      .getFullList<{ assetId: string; tagId: string }>(),
    ctx.pb
      .collection("tags")
      .getFullList<{ id: string; name: string; color: string }>(),
  ]);

  const assetIdSet = new Set(rows.map((row) => row.id));
  const filteredLinks = tagLinks.filter((link) => assetIdSet.has(link.assetId));
  const tagIdsByAssetId = new Map<string, string[]>();
  for (const link of filteredLinks) {
    const list = tagIdsByAssetId.get(link.assetId) ?? [];
    list.push(link.tagId);
    tagIdsByAssetId.set(link.assetId, list);
  }
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const categoryById = new Map(
    (categories.filter(Boolean) as CategoryRecord[]).map((c) => [c.id, c]),
  );
  const locationById = new Map(
    (locations.filter(Boolean) as LocationRecord[]).map((l) => [l.id, l]),
  );

  return rows.map((asset) => {
    const category = asset.categoryId
      ? (categoryById.get(asset.categoryId) ?? null)
      : null;
    const location = asset.locationId
      ? (locationById.get(asset.locationId) ?? null)
      : null;
    const tagIdsForAsset = tagIdsByAssetId.get(asset.id) ?? [];
    const tagNames = tagIdsForAsset
      .map((id) => tagById.get(id)?.name ?? null)
      .filter((name): name is string => !!name)
      .sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      );

    return {
      id: asset.id,
      name: asset.name,
      assetTag: asset.assetTag,
      status: asset.status,
      categoryId: asset.categoryId || null,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      locationId: asset.locationId || null,
      locationPath: location?.path ?? null,
      serviceGroupId: asset.serviceGroupId || null,
      notes: asset.notes || null,
      tagIds: tagIdsForAsset,
      tagNames,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  });
}

function matchesAssetSearch(row: AssetListView, needle: string) {
  if (!needle) return true;
  const haystacks = [
    row.name,
    row.assetTag,
    row.notes ?? "",
    ...row.tagNames,
  ];
  return haystacks.some((value) =>
    value.toLocaleLowerCase().includes(needle),
  );
}

export async function generateAssetTag(
  ctx: Ctx,
  categoryId: string | null,
): Promise<AssetTagPreview> {
  const prefix = await getCategoryPrefix(ctx, categoryId);
  return getNextAssetTagForPrefix(ctx, prefix);
}

export async function createAsset(
  ctx: Ctx,
  input: CreateAssetInput,
): Promise<{ assetId: string }> {
  const parsed = CreateAssetInput.parse(input);
  const name = requireAssetName(parsed.name);
  const normalizedName = normalizeAssetNameKey(name);
  const categoryId = parsed.categoryId ?? null;
  const locationId = parsed.locationId ?? null;
  const serviceGroupId = parsed.serviceGroupId ?? null;

  if (categoryId) await requireCategory(ctx, categoryId);
  if (locationId) await requireLocation(ctx, locationId);
  if (serviceGroupId) await requireServiceGroup(ctx, serviceGroupId);

  const status = parsed.status ?? "active";
  const notes = normalizeAssetNotes(parsed.notes);
  const customFieldValues = await validateAndNormalizeCustomFieldValues(
    ctx,
    parsed.customFieldValues,
  );

  const prefix = await getCategoryPrefix(ctx, categoryId);
  const preview = await getNextAssetTagForPrefix(ctx, prefix);

  const now = Date.now();
  const record = await ctx.pb.collection("assets").create<AssetRecord>({
    name,
    normalizedName,
    assetTag: preview.assetTag,
    status,
    categoryId: categoryId ?? "",
    locationId: locationId ?? "",
    serviceGroupId: serviceGroupId ?? "",
    notes: notes ?? "",
    customFieldValues,
    createdBy: parsed.actorId,
    updatedBy: parsed.actorId,
    createdAt: now,
    updatedAt: now,
  });

  await replaceAssetTags(ctx, record.id, parsed.tagIds ?? [], parsed.actorId);
  await updateFieldUsageCounts(ctx, {}, customFieldValues);

  return { assetId: record.id };
}

export async function getAsset(
  ctx: Ctx,
  assetId: string,
): Promise<AssetDetailView | null> {
  let asset: AssetRecord;
  try {
    asset = await ctx.pb.collection("assets").getOne<AssetRecord>(assetId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }

  const [category, location, serviceGroup, tags] = await Promise.all([
    asset.categoryId
      ? ctx.pb
          .collection("categories")
          .getOne<CategoryRecord>(asset.categoryId)
          .catch(() => null)
      : Promise.resolve(null),
    asset.locationId
      ? ctx.pb
          .collection("locations")
          .getOne<LocationRecord>(asset.locationId)
          .catch(() => null)
      : Promise.resolve(null),
    asset.serviceGroupId
      ? ctx.pb
          .collection("serviceGroups")
          .getOne<ServiceGroupRecord>(asset.serviceGroupId)
          .catch(() => null)
      : Promise.resolve(null),
    listTagsForAsset(ctx, asset.id),
  ]);

  return {
    id: asset.id,
    name: asset.name,
    assetTag: asset.assetTag,
    status: asset.status,
    categoryId: asset.categoryId || null,
    locationId: asset.locationId || null,
    serviceGroupId: asset.serviceGroupId || null,
    notes: asset.notes || null,
    customFieldValues: asset.customFieldValues ?? {},
    createdBy: asset.createdBy,
    updatedBy: asset.updatedBy,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    category: category
      ? {
          id: category.id,
          name: category.name,
          prefix: category.prefix || null,
          color: category.color,
        }
      : null,
    location: location
      ? {
          id: location.id,
          name: location.name,
          parentId: location.parentId || null,
          path: location.path,
        }
      : null,
    serviceGroup: serviceGroup
      ? { id: serviceGroup.id, name: serviceGroup.name }
      : null,
    tags,
  };
}

function dedupeIds(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function getAssetIdsForTags(
  ctx: Ctx,
  tagIds: string[],
): Promise<Set<string>> {
  if (tagIds.length === 0) return new Set();
  const sets = await Promise.all(
    tagIds.map(async (tagId) => {
      const links = await ctx.pb
        .collection("assetTags")
        .getFullList<{ assetId: string; tagId: string }>({
          filter: `tagId = "${escapeFilter(tagId)}"`,
        });
      return new Set(links.map((link) => link.assetId));
    }),
  );
  const [first, ...rest] = sets;
  if (!first) return new Set();
  const intersected = new Set(first);
  for (const set of rest) {
    for (const id of intersected) {
      if (!set.has(id)) intersected.delete(id);
    }
  }
  return intersected;
}

export async function listAssets(
  ctx: Ctx,
  input: ListAssetsInput = {},
): Promise<AssetListView[]> {
  const parsed = ListAssetsInput.parse(input);
  const normalizedTagIds = dedupeIds(parsed.tagIds ?? []);
  const normalizedSearch = parsed.search?.trim().toLocaleLowerCase() ?? "";

  const filters: string[] = [];
  if (parsed.categoryId !== undefined) {
    filters.push(
      parsed.categoryId
        ? `categoryId = "${escapeFilter(parsed.categoryId)}"`
        : `categoryId = ""`,
    );
  }
  if (parsed.locationId !== undefined) {
    filters.push(
      parsed.locationId
        ? `locationId = "${escapeFilter(parsed.locationId)}"`
        : `locationId = ""`,
    );
  }
  if (parsed.status !== undefined) {
    filters.push(`status = "${parsed.status}"`);
  }

  let tagAssetIds: Set<string> | null = null;
  if (normalizedTagIds.length > 0) {
    tagAssetIds = await getAssetIdsForTags(ctx, normalizedTagIds);
    if (tagAssetIds.size === 0) return [];
  }

  const rows = await ctx.pb
    .collection("assets")
    .getFullList<AssetRecord>({
      filter: filters.length > 0 ? filters.join(" && ") : undefined,
    });

  const filtered = tagAssetIds
    ? rows.filter((row) => tagAssetIds!.has(row.id))
    : rows;

  const views = await buildAssetListViews(ctx, filtered);
  const sorted = views
    .filter((row) => matchesAssetSearch(row, normalizedSearch))
    .sort(pickSort(parsed.sortBy, parsed.sortDirection));
  return sorted;
}

export async function updateAsset(
  ctx: Ctx,
  input: UpdateAssetInput,
): Promise<void> {
  const parsed = UpdateAssetInput.parse(input);
  const asset = await loadAsset(ctx, parsed.assetId);

  const name =
    parsed.name === undefined ? asset.name : requireAssetName(parsed.name);
  const normalizedName = normalizeAssetNameKey(name);
  const categoryId =
    parsed.categoryId === undefined
      ? asset.categoryId || null
      : (parsed.categoryId ?? null);
  const locationId =
    parsed.locationId === undefined
      ? asset.locationId || null
      : (parsed.locationId ?? null);
  const serviceGroupId =
    parsed.serviceGroupId === undefined
      ? asset.serviceGroupId || null
      : (parsed.serviceGroupId ?? null);
  const status = parsed.status ?? asset.status;

  if (categoryId) await requireCategory(ctx, categoryId);
  if (locationId) await requireLocation(ctx, locationId);
  if (serviceGroupId) await requireServiceGroup(ctx, serviceGroupId);

  const notes =
    parsed.notes === undefined
      ? asset.notes || null
      : normalizeAssetNotes(parsed.notes);
  const customFieldValues =
    parsed.customFieldValues === undefined
      ? (asset.customFieldValues ?? {})
      : await validateAndNormalizeCustomFieldValues(
          ctx,
          parsed.customFieldValues,
        );

  await ctx.pb.collection("assets").update(asset.id, {
    name,
    normalizedName,
    categoryId: categoryId ?? "",
    locationId: locationId ?? "",
    serviceGroupId: serviceGroupId ?? "",
    status,
    notes: notes ?? "",
    customFieldValues,
    updatedBy: parsed.actorId,
    updatedAt: Date.now(),
  });

  if (parsed.tagIds !== undefined) {
    await replaceAssetTags(ctx, asset.id, parsed.tagIds, parsed.actorId);
  }

  await updateFieldUsageCounts(
    ctx,
    asset.customFieldValues ?? {},
    customFieldValues,
  );
}

export async function updateAssetStatus(
  ctx: Ctx,
  input: UpdateAssetStatusInput,
): Promise<void> {
  const parsed = UpdateAssetStatusInput.parse(input);
  const asset = await loadAsset(ctx, parsed.assetId);
  if (asset.status === parsed.status) return;
  await ctx.pb.collection("assets").update(asset.id, {
    status: parsed.status,
    updatedBy: parsed.actorId,
    updatedAt: Date.now(),
  });
}

export async function deleteAsset(
  ctx: Ctx,
  assetId: string,
): Promise<void> {
  const asset = await loadAsset(ctx, assetId);
  await updateFieldUsageCounts(ctx, asset.customFieldValues ?? {}, {});

  // cascade: assetTags, attachments, serviceSchedules, serviceRecords.
  // PB relation cascadeDelete settings handle the DB side for collections
  // configured that way (assetTags, attachments, serviceSchedules,
  // serviceRecords — see pb_migrations), but we delete explicitly to also
  // reclaim attached file storage and keep semantics explicit.
  const [assetTagLinks, attachments, schedules, serviceRecords] =
    await Promise.all([
      ctx.pb.collection("assetTags").getFullList<{ id: string }>({
        filter: `assetId = "${escapeFilter(asset.id)}"`,
      }),
      ctx.pb
        .collection("attachments")
        .getFullList<{ id: string }>({
          filter: `assetId = "${escapeFilter(asset.id)}"`,
        }),
      ctx.pb
        .collection("serviceSchedules")
        .getFullList<{ id: string }>({
          filter: `assetId = "${escapeFilter(asset.id)}"`,
        }),
      ctx.pb
        .collection("serviceRecords")
        .getFullList<{ id: string }>({
          filter: `assetId = "${escapeFilter(asset.id)}"`,
        }),
    ]);

  for (const link of assetTagLinks) {
    await ctx.pb.collection("assetTags").delete(link.id);
  }
  for (const attachment of attachments) {
    await ctx.pb.collection("attachments").delete(attachment.id);
  }
  for (const schedule of schedules) {
    await ctx.pb.collection("serviceSchedules").delete(schedule.id);
  }
  for (const record of serviceRecords) {
    const recordAttachments = await ctx.pb
      .collection("serviceRecordAttachments")
      .getFullList<{ id: string }>({
        filter: `serviceRecordId = "${escapeFilter(record.id)}"`,
      });
    for (const ra of recordAttachments) {
      await ctx.pb.collection("serviceRecordAttachments").delete(ra.id);
    }
    await ctx.pb.collection("serviceRecords").delete(record.id);
  }

  await ctx.pb.collection("assets").delete(asset.id);
}

export async function getAssetTagIds(
  ctx: Ctx,
  assetId: string,
): Promise<string[]> {
  await loadAsset(ctx, assetId);
  return getTagIdsForAsset(ctx, assetId);
}

export type AssetFilterOptionsView = {
  categories: Array<{
    id: string;
    name: string;
    prefix: string | null;
    color: string;
  }>;
  locations: Array<{
    id: string;
    name: string;
    parentId: string | null;
    path: string;
  }>;
  tags: AssetTagView[];
  serviceGroups: Array<{ id: string; name: string }>;
};

export async function getAssetFilterOptions(
  ctx: Ctx,
): Promise<AssetFilterOptionsView> {
  const [categories, locations, tags, serviceGroups] = await Promise.all([
    ctx.pb
      .collection("categories")
      .getFullList<{
        id: string;
        name: string;
        prefix: string;
        color: string;
      }>(),
    ctx.pb
      .collection("locations")
      .getFullList<{
        id: string;
        name: string;
        parentId: string;
        path: string;
      }>(),
    ctx.pb
      .collection("tags")
      .getFullList<{
        id: string;
        name: string;
        color: string;
        createdAt: number;
        updatedAt: number;
      }>(),
    ctx.pb
      .collection("serviceGroups")
      .getFullList<{ id: string; name: string }>(),
  ]);

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

  return {
    categories: categories
      .slice()
      .sort(byName)
      .map((category) => ({
        id: category.id,
        name: category.name,
        prefix: category.prefix || null,
        color: category.color,
      })),
    locations: locations
      .slice()
      .sort((a, b) =>
        a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
      )
      .map((location) => ({
        id: location.id,
        name: location.name,
        parentId: location.parentId || null,
        path: location.path,
      })),
    tags: tags
      .slice()
      .sort(byName)
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })),
    serviceGroups: serviceGroups
      .slice()
      .sort(byName)
      .map((group) => ({ id: group.id, name: group.name })),
  };
}
