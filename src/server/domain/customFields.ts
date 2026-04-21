import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  CUSTOM_FIELD_TYPES,
  type CustomFieldType,
  ensureFieldNotInUse,
  ensureSafeTypeChange,
  normalizeFieldOptions,
  requireCustomFieldName,
} from "@/server/pb/custom-fields";
import { ConflictError, NotFoundError } from "@/server/pb/errors";

const fieldTypeSchema = z.enum(CUSTOM_FIELD_TYPES);

export const CreateFieldDefinitionInput = z.object({
  name: z.string(),
  fieldType: fieldTypeSchema,
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});

export const UpdateFieldDefinitionInput = z.object({
  fieldDefinitionId: z.string(),
  name: z.string(),
  fieldType: fieldTypeSchema,
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});

export type CreateFieldDefinitionInput = z.infer<
  typeof CreateFieldDefinitionInput
>;
export type UpdateFieldDefinitionInput = z.infer<
  typeof UpdateFieldDefinitionInput
>;

export type FieldDefinitionView = {
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

type FieldDefinitionRecord = {
  id: string;
  name: string;
  fieldType: CustomFieldType;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

function toFieldDefinitionView(
  record: FieldDefinitionRecord,
): FieldDefinitionView {
  return {
    id: record.id,
    name: record.name,
    fieldType: record.fieldType,
    options: Array.isArray(record.options) ? record.options : [],
    required: !!record.required,
    sortOrder: record.sortOrder,
    usageCount: record.usageCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function getDefinitionOrThrow(
  ctx: Ctx,
  fieldDefinitionId: string,
): Promise<FieldDefinitionRecord> {
  try {
    return await ctx.pb
      .collection("customFieldDefinitions")
      .getOne<FieldDefinitionRecord>(fieldDefinitionId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Field definition not found");
    }
    throw error;
  }
}

export async function listFieldDefinitions(
  ctx: Ctx,
): Promise<FieldDefinitionView[]> {
  const records = await ctx.pb
    .collection("customFieldDefinitions")
    .getFullList<FieldDefinitionRecord>({ sort: "sortOrder" });
  return records.map(toFieldDefinitionView);
}

export async function createFieldDefinition(
  ctx: Ctx,
  input: CreateFieldDefinitionInput,
): Promise<FieldDefinitionView> {
  const parsed = CreateFieldDefinitionInput.parse(input);
  const name = requireCustomFieldName(parsed.name);
  const options = normalizeFieldOptions(parsed.fieldType, parsed.options);
  const now = Date.now();

  const latest = await ctx.pb
    .collection("customFieldDefinitions")
    .getList<FieldDefinitionRecord>(1, 1, { sort: "-sortOrder" });
  const nextSortOrder = latest.items[0] ? latest.items[0].sortOrder + 1 : 0;

  const record = await ctx.pb
    .collection("customFieldDefinitions")
    .create<FieldDefinitionRecord>({
      name,
      fieldType: parsed.fieldType,
      options,
      required: parsed.required,
      sortOrder: nextSortOrder,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });

  return toFieldDefinitionView(record);
}

export async function updateFieldDefinition(
  ctx: Ctx,
  input: UpdateFieldDefinitionInput,
): Promise<FieldDefinitionView> {
  const parsed = UpdateFieldDefinitionInput.parse(input);
  const existing = await getDefinitionOrThrow(ctx, parsed.fieldDefinitionId);

  ensureSafeTypeChange(
    existing.fieldType,
    parsed.fieldType,
    existing.usageCount,
  );

  const name = requireCustomFieldName(parsed.name);
  const options = normalizeFieldOptions(parsed.fieldType, parsed.options);

  const record = await ctx.pb
    .collection("customFieldDefinitions")
    .update<FieldDefinitionRecord>(existing.id, {
      name,
      fieldType: parsed.fieldType,
      options,
      required: parsed.required,
      updatedAt: Date.now(),
    });

  return toFieldDefinitionView(record);
}

type LabelTemplateElement = {
  type?: string;
  fieldId?: string | null;
};

type LabelTemplateRecord = {
  id: string;
  elements: LabelTemplateElement[] | null;
};

export async function deleteFieldDefinition(
  ctx: Ctx,
  fieldDefinitionId: string,
): Promise<void> {
  const existing = await getDefinitionOrThrow(ctx, fieldDefinitionId);
  ensureFieldNotInUse(existing.usageCount);

  const templates = await ctx.pb
    .collection("labelTemplates")
    .getFullList<LabelTemplateRecord>();
  const referenced = templates.some((template) =>
    (template.elements ?? []).some(
      (element) =>
        element?.type === "customField" &&
        element?.fieldId === fieldDefinitionId,
    ),
  );
  if (referenced) {
    throw new ConflictError(
      "Field definition cannot be deleted while a label template references it",
    );
  }

  await ctx.pb.collection("customFieldDefinitions").delete(existing.id);
}

export async function reorderFieldDefinitions(
  ctx: Ctx,
  fieldDefinitionIds: string[],
): Promise<void> {
  const records = await ctx.pb
    .collection("customFieldDefinitions")
    .getFullList<FieldDefinitionRecord>();

  const existingIds = new Set(records.map((row) => row.id));
  const nextIds = new Set(fieldDefinitionIds);

  if (
    records.length !== fieldDefinitionIds.length ||
    existingIds.size !== nextIds.size
  ) {
    throw new ConflictError("Provide all field definitions when reordering");
  }

  for (const id of fieldDefinitionIds) {
    if (!existingIds.has(id)) {
      throw new ConflictError("Reorder payload contains an unknown field");
    }
  }

  const currentSortById = new Map(
    records.map((row) => [row.id, row.sortOrder]),
  );
  const now = Date.now();

  for (const [index, id] of fieldDefinitionIds.entries()) {
    if (currentSortById.get(id) === index) continue;
    await ctx.pb.collection("customFieldDefinitions").update(id, {
      sortOrder: index,
      updatedAt: now,
    });
  }
}
