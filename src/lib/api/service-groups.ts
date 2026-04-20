import { apiFetch } from "@/lib/api-client";

export type ServiceGroupSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
  assetCount: number;
  fieldCount: number;
};

export type AssignableGroup = { id: string; name: string };

export type ServiceGroupField = {
  id: string;
  groupId: string;
  label: string;
  fieldType: "text" | "textarea" | "number" | "date" | "checkbox" | "select";
  required: boolean;
  options: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

type GroupInput = {
  name: string;
  description?: string | null;
};

type FieldInput = {
  label: string;
  fieldType: ServiceGroupField["fieldType"];
  required: boolean;
  options?: string[];
};

export async function listServiceGroups(): Promise<ServiceGroupSummary[]> {
  const { groups } = await apiFetch<{ groups: ServiceGroupSummary[] }>(
    "/api/service-groups",
  );
  return groups;
}

export async function listAssignableServiceGroups(): Promise<
  AssignableGroup[]
> {
  const { groups } = await apiFetch<{ groups: AssignableGroup[] }>(
    "/api/service-groups?variant=assignable",
  );
  return groups;
}

export async function getServiceGroup(
  groupId: string,
): Promise<ServiceGroupSummary | null> {
  const { group } = await apiFetch<{ group: ServiceGroupSummary | null }>(
    `/api/service-groups/${groupId}`,
  );
  return group;
}

export async function createServiceGroup(
  input: GroupInput,
): Promise<ServiceGroupSummary> {
  const { group } = await apiFetch<{ group: ServiceGroupSummary }>(
    "/api/service-groups",
    { method: "POST", body: input },
  );
  return group;
}

export async function updateServiceGroup(
  groupId: string,
  input: GroupInput,
): Promise<ServiceGroupSummary> {
  const { group } = await apiFetch<{ group: ServiceGroupSummary }>(
    `/api/service-groups/${groupId}`,
    { method: "PATCH", body: input },
  );
  return group;
}

export async function deleteServiceGroup(groupId: string): Promise<void> {
  await apiFetch(`/api/service-groups/${groupId}`, { method: "DELETE" });
}

export type GroupAsset = {
  id: string;
  name: string;
  assetTag: string;
  status: "active" | "in_storage" | "under_repair" | "retired" | "disposed";
};

export async function listServiceGroupAssets(
  groupId: string,
): Promise<GroupAsset[]> {
  const { assets } = await apiFetch<{ assets: GroupAsset[] }>(
    `/api/service-groups/${groupId}/assets`,
  );
  return assets;
}

export async function listServiceGroupFields(
  groupId: string,
): Promise<ServiceGroupField[]> {
  const { fields } = await apiFetch<{ fields: ServiceGroupField[] }>(
    `/api/service-groups/${groupId}/fields`,
  );
  return fields;
}

export async function createServiceGroupField(
  groupId: string,
  input: FieldInput,
): Promise<ServiceGroupField> {
  const { field } = await apiFetch<{ field: ServiceGroupField }>(
    `/api/service-groups/${groupId}/fields`,
    { method: "POST", body: input },
  );
  return field;
}

export async function reorderServiceGroupFields(
  groupId: string,
  fieldIds: string[],
): Promise<void> {
  await apiFetch(`/api/service-groups/${groupId}/fields/reorder`, {
    method: "POST",
    body: { fieldIds },
  });
}

export async function updateServiceGroupField(
  fieldId: string,
  input: FieldInput,
): Promise<ServiceGroupField> {
  const { field } = await apiFetch<{ field: ServiceGroupField }>(
    `/api/service-group-fields/${fieldId}`,
    { method: "PATCH", body: input },
  );
  return field;
}

export async function deleteServiceGroupField(
  fieldId: string,
): Promise<void> {
  await apiFetch(`/api/service-group-fields/${fieldId}`, { method: "DELETE" });
}
