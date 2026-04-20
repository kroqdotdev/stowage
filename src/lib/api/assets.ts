import { apiFetch } from "@/lib/api-client";

export const ASSET_STATUSES = [
  "active",
  "in_storage",
  "under_repair",
  "retired",
  "disposed",
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export type AssetCustomFieldValue = string | number | boolean | null;

export type AssetListItem = {
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

export type AssetDetail = {
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
  tags: Array<{ id: string; name: string; color: string }>;
};

export type AssetTagPreview = {
  assetTag: string;
  prefix: string;
  nextNumber: number;
};

export type ListAssetsParams = {
  categoryId?: string | null;
  locationId?: string | null;
  status?: AssetStatus;
  tagIds?: string[];
  search?: string;
  sortBy?: "createdAt" | "name" | "assetTag" | "status";
  sortDirection?: "asc" | "desc";
};

type CreateAssetInput = {
  name: string;
  categoryId?: string | null;
  locationId?: string | null;
  serviceGroupId?: string | null;
  status?: AssetStatus;
  notes?: string | null;
  customFieldValues?: Record<string, AssetCustomFieldValue>;
  tagIds?: string[];
};

type UpdateAssetInput = Partial<CreateAssetInput>;

function buildAssetsQuery(params: ListAssetsParams): string {
  const qs = new URLSearchParams();
  if (params.categoryId !== undefined && params.categoryId !== null) {
    qs.set("categoryId", params.categoryId);
  }
  if (params.locationId !== undefined && params.locationId !== null) {
    qs.set("locationId", params.locationId);
  }
  if (params.status !== undefined) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortDirection) qs.set("sortDirection", params.sortDirection);
  for (const id of params.tagIds ?? []) qs.append("tagId", id);
  const q = qs.toString();
  return q ? `?${q}` : "";
}

export async function listAssets(
  params: ListAssetsParams = {},
): Promise<AssetListItem[]> {
  const { assets } = await apiFetch<{ assets: AssetListItem[] }>(
    `/api/assets${buildAssetsQuery(params)}`,
  );
  return assets;
}

export async function getAsset(
  assetId: string,
): Promise<AssetDetail | null> {
  const { asset } = await apiFetch<{ asset: AssetDetail | null }>(
    `/api/assets/${assetId}`,
  );
  return asset;
}

export async function createAsset(
  input: CreateAssetInput,
): Promise<{ assetId: string }> {
  return apiFetch<{ assetId: string }>("/api/assets", {
    method: "POST",
    body: input,
  });
}

export async function updateAsset(
  assetId: string,
  input: UpdateAssetInput,
): Promise<void> {
  await apiFetch(`/api/assets/${assetId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function updateAssetStatus(
  assetId: string,
  status: AssetStatus,
): Promise<void> {
  await apiFetch(`/api/assets/${assetId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function deleteAsset(assetId: string): Promise<void> {
  await apiFetch(`/api/assets/${assetId}`, { method: "DELETE" });
}

export type AssetFilterOptions = {
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
  tags: Array<{
    id: string;
    name: string;
    color: string;
    createdAt: number;
    updatedAt: number;
  }>;
  serviceGroups: Array<{ id: string; name: string }>;
};

export type LabelPreviewAsset = {
  id: string;
  name: string;
  assetTag: string;
  categoryName: string | null;
  locationPath: string | null;
  notes: string | null;
  customFieldValues: Record<string, AssetCustomFieldValue>;
};

export async function getLabelPreviewAsset(): Promise<LabelPreviewAsset | null> {
  const { asset } = await apiFetch<{ asset: LabelPreviewAsset | null }>(
    "/api/assets/label-preview",
  );
  return asset;
}

export async function getAssetsForLabels(
  assetIds: string[],
): Promise<LabelPreviewAsset[]> {
  if (assetIds.length === 0) return [];
  const qs = new URLSearchParams();
  for (const id of assetIds) qs.append("assetId", id);
  const { assets } = await apiFetch<{ assets: LabelPreviewAsset[] }>(
    `/api/assets/for-labels?${qs.toString()}`,
  );
  return assets;
}

export async function getAssetFilterOptions(): Promise<AssetFilterOptions> {
  const { options } = await apiFetch<{ options: AssetFilterOptions }>(
    "/api/assets/filter-options",
  );
  return options;
}

export async function previewAssetTag(
  categoryId: string | null,
): Promise<AssetTagPreview> {
  const qs = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
  const { preview } = await apiFetch<{ preview: AssetTagPreview }>(
    `/api/assets/preview-tag${qs}`,
  );
  return preview;
}

export async function setAssetTags(
  assetId: string,
  tagIds: string[],
): Promise<void> {
  await apiFetch(`/api/assets/${assetId}/tags`, {
    method: "PUT",
    body: { tagIds },
  });
}

export type AssetTag = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export async function getAssetTags(assetId: string): Promise<AssetTag[]> {
  const { tags } = await apiFetch<{ tags: AssetTag[] }>(
    `/api/assets/${assetId}/tags`,
  );
  return tags;
}
