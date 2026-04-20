import { apiFetch } from "@/lib/api-client";

export const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "dropdown",
  "checkbox",
  "url",
  "currency",
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type CustomFieldDefinition = {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  options: string[];
  required: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

type CreateInput = {
  name: string;
  fieldType: CustomFieldType;
  options?: string[];
  required: boolean;
};

type UpdateInput = {
  name: string;
  fieldType: CustomFieldType;
  options?: string[];
  required: boolean;
};

export async function listCustomFields(): Promise<CustomFieldDefinition[]> {
  const { fields } = await apiFetch<{ fields: CustomFieldDefinition[] }>(
    "/api/custom-fields",
  );
  return fields;
}

export async function createCustomField(
  input: CreateInput,
): Promise<CustomFieldDefinition> {
  const { field } = await apiFetch<{ field: CustomFieldDefinition }>(
    "/api/custom-fields",
    { method: "POST", body: input },
  );
  return field;
}

export async function updateCustomField(
  fieldDefinitionId: string,
  input: UpdateInput,
): Promise<CustomFieldDefinition> {
  const { field } = await apiFetch<{ field: CustomFieldDefinition }>(
    `/api/custom-fields/${fieldDefinitionId}`,
    { method: "PATCH", body: input },
  );
  return field;
}

export async function deleteCustomField(
  fieldDefinitionId: string,
): Promise<void> {
  await apiFetch(`/api/custom-fields/${fieldDefinitionId}`, {
    method: "DELETE",
  });
}

export async function reorderCustomFields(
  fieldDefinitionIds: string[],
): Promise<void> {
  await apiFetch("/api/custom-fields/reorder", {
    method: "POST",
    body: { fieldDefinitionIds },
  });
}
