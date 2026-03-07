import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";
import {
  SERVICE_GROUP_FIELD_TYPES,
  normalizeServiceFieldInput,
  throwServiceRecordError,
  type ServiceGroupFieldType,
} from "./service_record_helpers";

const serviceGroupFieldTypeValidator = v.union(
  ...SERVICE_GROUP_FIELD_TYPES.map((fieldType) => v.literal(fieldType)),
);

const serviceGroupFieldValidator = v.object({
  _id: v.id("serviceGroupFields"),
  _creationTime: v.number(),
  groupId: v.id("serviceGroups"),
  label: v.string(),
  fieldType: serviceGroupFieldTypeValidator,
  required: v.boolean(),
  options: v.array(v.string()),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
});

type ServiceGroupFieldRow = {
  _id: Id<"serviceGroupFields">;
  _creationTime: number;
  groupId: Id<"serviceGroups">;
  label: string;
  normalizedLabel: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

async function requireGroup(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"serviceGroups">,
) {
  const group = await ctx.db.get(groupId);
  if (!group) {
    throwServiceRecordError("GROUP_NOT_FOUND", "Service group not found");
  }
}

async function requireField(
  ctx: QueryCtx | MutationCtx,
  fieldId: Id<"serviceGroupFields">,
) {
  const field = (await ctx.db.get(fieldId)) as ServiceGroupFieldRow | null;
  if (!field) {
    throwServiceRecordError("FIELD_NOT_FOUND", "Service group field not found");
  }
  return field;
}

async function ensureUniqueFieldLabel(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"serviceGroups">,
  normalizedLabel: string,
  existingFieldId?: Id<"serviceGroupFields">,
) {
  const existing = (await ctx.db
    .query("serviceGroupFields")
    .withIndex("by_groupId_and_normalizedLabel", (q) =>
      q.eq("groupId", groupId).eq("normalizedLabel", normalizedLabel),
    )
    .first()) as ServiceGroupFieldRow | null;

  if (existing && existing._id !== existingFieldId) {
    throwServiceRecordError(
      "INVALID_FIELD_VALUE",
      "Field labels must be unique within a service group",
    );
  }
}

export const listFields = query({
  args: {
    groupId: v.id("serviceGroups"),
  },
  returns: v.array(serviceGroupFieldValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireGroup(ctx, args.groupId);

    const fields = (await ctx.db
      .query("serviceGroupFields")
      .withIndex("by_groupId_and_sortOrder", (q) =>
        q.eq("groupId", args.groupId),
      )
      .collect()) as ServiceGroupFieldRow[];

    return fields.map((field) => ({
      _id: field._id,
      _creationTime: field._creationTime,
      groupId: field.groupId,
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      options: field.options,
      sortOrder: field.sortOrder,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
      createdBy: field.createdBy,
      updatedBy: field.updatedBy,
    }));
  },
});

export const createField = mutation({
  args: {
    groupId: v.id("serviceGroups"),
    label: v.string(),
    fieldType: serviceGroupFieldTypeValidator,
    required: v.boolean(),
    options: v.optional(v.array(v.string())),
  },
  returns: v.object({ fieldId: v.id("serviceGroupFields") }),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    await requireGroup(ctx, args.groupId);

    const normalized = normalizeServiceFieldInput({
      label: args.label,
      fieldType: args.fieldType as ServiceGroupFieldType,
      options: args.options ?? [],
    });

    await ensureUniqueFieldLabel(
      ctx,
      args.groupId,
      normalized.normalizedLabel,
      undefined,
    );

    const existingFields = await ctx.db
      .query("serviceGroupFields")
      .withIndex("by_groupId_and_sortOrder", (q) =>
        q.eq("groupId", args.groupId),
      )
      .collect();

    const maxSortOrder = existingFields.reduce((max, row) => {
      const currentSortOrder = (row as { sortOrder: number }).sortOrder;
      return currentSortOrder > max ? currentSortOrder : max;
    }, -1);

    const now = Date.now();
    const fieldId = await ctx.db.insert("serviceGroupFields", {
      groupId: args.groupId,
      label: normalized.label,
      normalizedLabel: normalized.normalizedLabel,
      fieldType: args.fieldType as ServiceGroupFieldType,
      required: args.required,
      options: normalized.options,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
      createdBy: actor._id as Id<"users">,
      updatedBy: actor._id as Id<"users">,
    });

    return { fieldId };
  },
});

export const updateField = mutation({
  args: {
    fieldId: v.id("serviceGroupFields"),
    label: v.string(),
    fieldType: serviceGroupFieldTypeValidator,
    required: v.boolean(),
    options: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const field = await requireField(ctx, args.fieldId);

    const normalized = normalizeServiceFieldInput({
      label: args.label,
      fieldType: args.fieldType as ServiceGroupFieldType,
      options: args.options ?? [],
    });

    await ensureUniqueFieldLabel(
      ctx,
      field.groupId,
      normalized.normalizedLabel,
      field._id,
    );

    await ctx.db.patch(field._id, {
      label: normalized.label,
      normalizedLabel: normalized.normalizedLabel,
      fieldType: args.fieldType as ServiceGroupFieldType,
      required: args.required,
      options: normalized.options,
      updatedAt: Date.now(),
      updatedBy: actor._id as Id<"users">,
    });

    return null;
  },
});

export const deleteField = mutation({
  args: {
    fieldId: v.id("serviceGroupFields"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const field = await requireField(ctx, args.fieldId);

    await ctx.db.delete(field._id);

    const remainingFields = (await ctx.db
      .query("serviceGroupFields")
      .withIndex("by_groupId_and_sortOrder", (q) =>
        q.eq("groupId", field.groupId),
      )
      .collect()) as ServiceGroupFieldRow[];

    await Promise.all(
      remainingFields.map((remainingField, index) =>
        ctx.db.patch(remainingField._id, { sortOrder: index }),
      ),
    );

    return null;
  },
});

export const reorderFields = mutation({
  args: {
    groupId: v.id("serviceGroups"),
    fieldIds: v.array(v.id("serviceGroupFields")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    await requireGroup(ctx, args.groupId);

    const fields = (await ctx.db
      .query("serviceGroupFields")
      .withIndex("by_groupId_and_sortOrder", (q) =>
        q.eq("groupId", args.groupId),
      )
      .collect()) as ServiceGroupFieldRow[];

    if (args.fieldIds.length !== fields.length) {
      throwServiceRecordError(
        "INVALID_FIELD_VALUE",
        "Field order must include all fields",
      );
    }

    const existingIds = new Set(fields.map((field) => String(field._id)));
    const providedIds = new Set(
      args.fieldIds.map((fieldId) => String(fieldId)),
    );
    if (
      existingIds.size !== providedIds.size ||
      Array.from(existingIds).some((id) => !providedIds.has(id))
    ) {
      throwServiceRecordError(
        "INVALID_FIELD_VALUE",
        "Field order contains invalid fields",
      );
    }

    await Promise.all(
      args.fieldIds.map((fieldId, index) =>
        ctx.db.patch(fieldId, { sortOrder: index }),
      ),
    );

    return null;
  },
});
