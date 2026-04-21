import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import { ConflictError, NotFoundError } from "@/server/pb/errors";
import {
  SERVICE_GROUP_FIELD_TYPES,
  normalizeServiceFieldInput,
  type ServiceGroupFieldType,
} from "@/server/pb/service-catalog";

const fieldTypeSchema = z.enum(SERVICE_GROUP_FIELD_TYPES);

export const CreateFieldInput = z.object({
  groupId: z.string(),
  label: z.string(),
  fieldType: fieldTypeSchema,
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  actorId: z.string(),
});

export const UpdateFieldInput = CreateFieldInput.omit({ groupId: true }).extend(
  {
    fieldId: z.string(),
  },
);

export const ReorderFieldsInput = z.object({
  groupId: z.string(),
  fieldIds: z.array(z.string()),
});

export type CreateFieldInput = z.infer<typeof CreateFieldInput>;
export type UpdateFieldInput = z.infer<typeof UpdateFieldInput>;

export type FieldView = {
  id: string;
  groupId: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

type FieldRecord = {
  id: string;
  groupId: string;
  label: string;
  normalizedLabel: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

function toFieldView(record: FieldRecord): FieldView {
  return {
    id: record.id,
    groupId: record.groupId,
    label: record.label,
    fieldType: record.fieldType,
    required: !!record.required,
    options: Array.isArray(record.options) ? record.options : [],
    sortOrder: record.sortOrder,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}

async function assertGroupExists(ctx: Ctx, groupId: string) {
  try {
    await ctx.pb.collection("serviceGroups").getOne(groupId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Service group not found");
    }
    throw error;
  }
}

async function loadField(ctx: Ctx, fieldId: string): Promise<FieldRecord> {
  try {
    return await ctx.pb
      .collection("serviceGroupFields")
      .getOne<FieldRecord>(fieldId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Service group field not found");
    }
    throw error;
  }
}

async function assertUniqueLabel(
  ctx: Ctx,
  groupId: string,
  normalizedLabel: string,
  excludeId?: string,
) {
  const escaped = normalizedLabel.replace(/"/g, '\\"');
  const matches = await ctx.pb
    .collection("serviceGroupFields")
    .getList<FieldRecord>(1, 2, {
      filter: `groupId = "${groupId}" && normalizedLabel = "${escaped}"`,
    });
  const duplicate = matches.items.find((row) => row.id !== excludeId);
  if (duplicate) {
    throw new ConflictError(
      "Field labels must be unique within a service group",
    );
  }
}

export async function listFields(
  ctx: Ctx,
  groupId: string,
): Promise<FieldView[]> {
  await assertGroupExists(ctx, groupId);
  const records = await ctx.pb
    .collection("serviceGroupFields")
    .getFullList<FieldRecord>({
      filter: `groupId = "${groupId}"`,
      sort: "sortOrder",
    });
  return records.map(toFieldView);
}

export async function createField(
  ctx: Ctx,
  input: CreateFieldInput,
): Promise<FieldView> {
  const parsed = CreateFieldInput.parse(input);
  await assertGroupExists(ctx, parsed.groupId);

  const normalized = normalizeServiceFieldInput({
    label: parsed.label,
    fieldType: parsed.fieldType,
    options: parsed.options ?? [],
  });
  await assertUniqueLabel(ctx, parsed.groupId, normalized.normalizedLabel);

  const existing = await ctx.pb
    .collection("serviceGroupFields")
    .getList<FieldRecord>(1, 1, {
      filter: `groupId = "${parsed.groupId}"`,
      sort: "-sortOrder",
    });
  const nextSortOrder = existing.items[0] ? existing.items[0].sortOrder + 1 : 0;

  const now = Date.now();
  const record = await ctx.pb
    .collection("serviceGroupFields")
    .create<FieldRecord>({
      groupId: parsed.groupId,
      label: normalized.label,
      normalizedLabel: normalized.normalizedLabel,
      fieldType: parsed.fieldType,
      required: parsed.required,
      options: normalized.options,
      sortOrder: nextSortOrder,
      createdAt: now,
      updatedAt: now,
      createdBy: parsed.actorId,
      updatedBy: parsed.actorId,
    });

  return toFieldView(record);
}

export async function updateField(
  ctx: Ctx,
  input: UpdateFieldInput,
): Promise<FieldView> {
  const parsed = UpdateFieldInput.parse(input);
  const field = await loadField(ctx, parsed.fieldId);

  const normalized = normalizeServiceFieldInput({
    label: parsed.label,
    fieldType: parsed.fieldType,
    options: parsed.options ?? [],
  });
  await assertUniqueLabel(
    ctx,
    field.groupId,
    normalized.normalizedLabel,
    field.id,
  );

  const record = await ctx.pb
    .collection("serviceGroupFields")
    .update<FieldRecord>(field.id, {
      label: normalized.label,
      normalizedLabel: normalized.normalizedLabel,
      fieldType: parsed.fieldType,
      required: parsed.required,
      options: normalized.options,
      updatedAt: Date.now(),
      updatedBy: parsed.actorId,
    });
  return toFieldView(record);
}

export async function deleteField(ctx: Ctx, fieldId: string): Promise<void> {
  const field = await loadField(ctx, fieldId);
  await ctx.pb.collection("serviceGroupFields").delete(field.id);

  // Renumber remaining fields in the same group so sortOrder stays dense.
  const remaining = await ctx.pb
    .collection("serviceGroupFields")
    .getFullList<FieldRecord>({
      filter: `groupId = "${field.groupId}"`,
      sort: "sortOrder",
    });
  for (const [index, remainingField] of remaining.entries()) {
    if (remainingField.sortOrder !== index) {
      await ctx.pb
        .collection("serviceGroupFields")
        .update(remainingField.id, { sortOrder: index });
    }
  }
}

export async function reorderFields(
  ctx: Ctx,
  input: z.infer<typeof ReorderFieldsInput>,
): Promise<void> {
  const parsed = ReorderFieldsInput.parse(input);
  const fields = await ctx.pb
    .collection("serviceGroupFields")
    .getFullList<FieldRecord>({ filter: `groupId = "${parsed.groupId}"` });

  if (parsed.fieldIds.length !== fields.length) {
    throw new ConflictError("Field order must include all fields");
  }
  const existingIds = new Set(fields.map((f) => f.id));
  const providedIds = new Set(parsed.fieldIds);
  if (
    existingIds.size !== providedIds.size ||
    ![...existingIds].every((id) => providedIds.has(id))
  ) {
    throw new ConflictError("Field order contains invalid fields");
  }

  const currentSortById = new Map(
    fields.map((f) => [f.id, f.sortOrder] as const),
  );
  for (const [index, fieldId] of parsed.fieldIds.entries()) {
    if (currentSortById.get(fieldId) === index) continue;
    await ctx.pb
      .collection("serviceGroupFields")
      .update(fieldId, { sortOrder: index });
  }
}
