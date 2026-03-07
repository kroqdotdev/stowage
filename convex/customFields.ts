import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";
import {
  ensureFieldNotInUse,
  ensureSafeTypeChange,
  normalizeFieldOptions,
  requireCustomFieldName,
} from "./custom_fields_helpers";

const fieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("date"),
  v.literal("dropdown"),
  v.literal("checkbox"),
  v.literal("url"),
  v.literal("currency"),
);

const fieldDefinitionViewValidator = v.object({
  _id: v.id("customFieldDefinitions"),
  _creationTime: v.number(),
  name: v.string(),
  fieldType: fieldTypeValidator,
  options: v.array(v.string()),
  required: v.boolean(),
  sortOrder: v.number(),
  usageCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type FieldDefinitionRow = {
  _id: Id<"customFieldDefinitions">;
  _creationTime: number;
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
  sortOrder: number;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

function toFieldDefinitionView(fieldDefinition: FieldDefinitionRow) {
  return {
    _id: fieldDefinition._id,
    _creationTime: fieldDefinition._creationTime,
    name: fieldDefinition.name,
    fieldType: fieldDefinition.fieldType,
    options: fieldDefinition.options,
    required: fieldDefinition.required,
    sortOrder: fieldDefinition.sortOrder,
    usageCount: fieldDefinition.usageCount,
    createdAt: fieldDefinition.createdAt,
    updatedAt: fieldDefinition.updatedAt,
  };
}

export const listFieldDefinitions = query({
  args: {},
  returns: v.array(fieldDefinitionViewValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const rows = (await ctx.db
      .query("customFieldDefinitions")
      .withIndex("by_sortOrder")
      .collect()) as FieldDefinitionRow[];

    return rows.map((row) => toFieldDefinitionView(row));
  },
});

export const createFieldDefinition = mutation({
  args: {
    name: v.string(),
    fieldType: fieldTypeValidator,
    options: v.optional(v.array(v.string())),
    required: v.boolean(),
  },
  returns: v.object({ fieldDefinitionId: v.id("customFieldDefinitions") }),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const name = requireCustomFieldName(args.name);
    const options = normalizeFieldOptions(args.fieldType, args.options);
    const now = Date.now();

    const lastDefinition = (await ctx.db
      .query("customFieldDefinitions")
      .withIndex("by_sortOrder")
      .order("desc")
      .first()) as FieldDefinitionRow | null;

    const nextSortOrder = lastDefinition ? lastDefinition.sortOrder + 1 : 0;

    const fieldDefinitionId = await ctx.db.insert("customFieldDefinitions", {
      name,
      fieldType: args.fieldType,
      options,
      required: args.required,
      sortOrder: nextSortOrder,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { fieldDefinitionId };
  },
});

export const updateFieldDefinition = mutation({
  args: {
    fieldDefinitionId: v.id("customFieldDefinitions"),
    name: v.string(),
    fieldType: fieldTypeValidator,
    options: v.optional(v.array(v.string())),
    required: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const existing = (await ctx.db.get(
      args.fieldDefinitionId,
    )) as FieldDefinitionRow | null;
    if (!existing) {
      throw new ConvexError("Field definition not found");
    }

    ensureSafeTypeChange(
      existing.fieldType,
      args.fieldType,
      existing.usageCount,
    );

    const name = requireCustomFieldName(args.name);
    const options = normalizeFieldOptions(args.fieldType, args.options);

    await ctx.db.patch(args.fieldDefinitionId, {
      name,
      fieldType: args.fieldType,
      options,
      required: args.required,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteFieldDefinition = mutation({
  args: { fieldDefinitionId: v.id("customFieldDefinitions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const fieldDefinition = (await ctx.db.get(
      args.fieldDefinitionId,
    )) as FieldDefinitionRow | null;
    if (!fieldDefinition) {
      throw new ConvexError("Field definition not found");
    }

    ensureFieldNotInUse(fieldDefinition.usageCount);

    const templates = await ctx.db.query("labelTemplates").collect();
    const isReferencedByTemplate = templates.some((template) =>
      (
        template as {
          elements: Array<{
            type: string;
            fieldId?: Id<"customFieldDefinitions"> | null;
          }>;
        }
      ).elements.some(
        (element) =>
          element.type === "customField" &&
          element.fieldId === args.fieldDefinitionId,
      ),
    );
    if (isReferencedByTemplate) {
      throw new ConvexError(
        "Field definition cannot be deleted while a label template references it",
      );
    }

    await ctx.db.delete(args.fieldDefinitionId);
    return null;
  },
});

export const reorderFieldDefinitions = mutation({
  args: { fieldDefinitionIds: v.array(v.id("customFieldDefinitions")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const rows = (await ctx.db
      .query("customFieldDefinitions")
      .collect()) as FieldDefinitionRow[];
    const rowIdSet = new Set(rows.map((row) => row._id));
    const nextIdSet = new Set(args.fieldDefinitionIds);

    if (
      rows.length !== args.fieldDefinitionIds.length ||
      rowIdSet.size !== nextIdSet.size
    ) {
      throw new ConvexError("Provide all field definitions when reordering");
    }

    for (const fieldDefinitionId of args.fieldDefinitionIds) {
      if (!rowIdSet.has(fieldDefinitionId)) {
        throw new ConvexError("Reorder payload contains an unknown field");
      }
    }

    const currentSortById = new Map(
      rows.map((row) => [row._id, row.sortOrder]),
    );
    const now = Date.now();
    const updates: Promise<void>[] = [];

    for (const [
      index,
      fieldDefinitionId,
    ] of args.fieldDefinitionIds.entries()) {
      if (currentSortById.get(fieldDefinitionId) === index) {
        continue;
      }
      updates.push(
        ctx.db.patch(fieldDefinitionId, {
          sortOrder: index,
          updatedAt: now,
        }),
      );
    }

    await Promise.all(updates);
    return null;
  },
});
