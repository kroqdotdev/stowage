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
  createDefaultLabelTemplateDefinitions,
  labelTemplateElementValidator,
  normalizeLabelTemplateInput,
  throwLabelTemplateError,
  type LabelTemplateElementInput,
  type LabelTemplateRecord,
} from "./label_template_helpers";

const labelTemplateValidator = v.object({
  _id: v.id("labelTemplates"),
  _creationTime: v.number(),
  name: v.string(),
  widthMm: v.number(),
  heightMm: v.number(),
  elements: v.array(labelTemplateElementValidator),
  isDefault: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
});

function sortTemplates(templates: LabelTemplateRecord[]) {
  return templates
    .slice()
    .sort((a: LabelTemplateRecord, b: LabelTemplateRecord) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}

async function listAllTemplates(ctx: QueryCtx | MutationCtx) {
  return (await ctx.db
    .query("labelTemplates")
    .collect()) as LabelTemplateRecord[];
}

function toLabelTemplateView(template: LabelTemplateRecord) {
  return {
    _id: template._id,
    _creationTime: template._creationTime,
    name: template.name,
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    elements: template.elements,
    isDefault: template.isDefault,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    createdBy: template.createdBy,
    updatedBy: template.updatedBy,
  };
}

async function requireTemplate(
  ctx: QueryCtx | MutationCtx,
  templateId: Id<"labelTemplates">,
) {
  const template = (await ctx.db.get(templateId)) as LabelTemplateRecord | null;
  if (!template) {
    throwLabelTemplateError("TEMPLATE_NOT_FOUND", "Label template not found");
  }
  return template;
}

async function requireUniqueName({
  ctx,
  normalizedName,
  templateId,
}: {
  ctx: QueryCtx | MutationCtx;
  normalizedName: string;
  templateId?: Id<"labelTemplates">;
}) {
  const existing = (await ctx.db
    .query("labelTemplates")
    .withIndex("by_normalizedName", (q) =>
      q.eq("normalizedName", normalizedName),
    )
    .first()) as LabelTemplateRecord | null;

  if (existing && existing._id !== templateId) {
    throwLabelTemplateError(
      "TEMPLATE_NAME_IN_USE",
      "A label template with this name already exists",
    );
  }
}

async function ensureReferencedCustomFieldsExist({
  ctx,
  elements,
}: {
  ctx: QueryCtx | MutationCtx;
  elements: LabelTemplateElementInput[];
}) {
  const customFieldIds = Array.from(
    new Set(
      elements
        .filter((element) => element.type === "customField")
        .map((element) => element.fieldId ?? null)
        .filter(
          (
            fieldId,
          ): fieldId is NonNullable<LabelTemplateElementInput["fieldId"]> =>
            fieldId !== null,
        ),
    ),
  );

  const fields = await Promise.all(
    customFieldIds.map((fieldId) => ctx.db.get(fieldId)),
  );

  customFieldIds.forEach((fieldId, index) => {
    if (!fields[index]) {
      throwLabelTemplateError(
        "INVALID_TEMPLATE_ELEMENT",
        `Referenced custom field is missing: ${fieldId}`,
      );
    }
  });
}

async function patchDefaultState({
  ctx,
  templateId,
}: {
  ctx: MutationCtx;
  templateId: Id<"labelTemplates">;
}) {
  const templates = await listAllTemplates(ctx);
  await Promise.all(
    templates.map((template) =>
      ctx.db.patch(template._id, {
        isDefault: template._id === templateId,
      }),
    ),
  );
}

async function ensureDefaultTemplatesExist(
  ctx: MutationCtx,
  actorId: Id<"users">,
) {
  const now = Date.now();
  const existingTemplates = await listAllTemplates(ctx);
  const existingByName = new Map(
    existingTemplates.map((template) => [template.normalizedName, template]),
  );

  let seeded = false;
  let defaultTemplateId =
    existingTemplates.find((template) => template.isDefault)?._id ?? null;

  for (const template of createDefaultLabelTemplateDefinitions()) {
    const existing = existingByName.get(template.normalizedName);
    if (existing) {
      if (template.isDefault && !defaultTemplateId) {
        defaultTemplateId = existing._id;
      }
      continue;
    }

    const templateId = await ctx.db.insert("labelTemplates", {
      name: template.name,
      normalizedName: template.normalizedName,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      elements: template.elements,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    });
    existingByName.set(template.normalizedName, {
      _id: templateId,
      _creationTime: now,
      name: template.name,
      normalizedName: template.normalizedName,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      elements: template.elements,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    });
    seeded = true;

    if (template.isDefault && !defaultTemplateId) {
      defaultTemplateId = templateId;
    }
  }

  if (!defaultTemplateId) {
    const fallback =
      existingByName.get("thermal 57x32 mm") ??
      Array.from(existingByName.values()).at(0) ??
      null;
    defaultTemplateId = fallback?._id ?? null;
  }

  if (defaultTemplateId) {
    await patchDefaultState({ ctx, templateId: defaultTemplateId });
  }

  return { seeded };
}

export const listTemplates = query({
  args: {},
  returns: v.array(labelTemplateValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    return sortTemplates(await listAllTemplates(ctx)).map(
      (template: LabelTemplateRecord) => toLabelTemplateView(template),
    );
  },
});

export const getTemplate = query({
  args: { templateId: v.id("labelTemplates") },
  returns: v.union(labelTemplateValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const template = (await ctx.db.get(
      args.templateId,
    )) as LabelTemplateRecord | null;
    if (!template) {
      return null;
    }

    return toLabelTemplateView(template);
  },
});

export const getDefaultTemplate = query({
  args: {},
  returns: v.union(labelTemplateValidator, v.null()),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    const templates = sortTemplates(await listAllTemplates(ctx));
    const template =
      templates.find((candidate: LabelTemplateRecord) => candidate.isDefault) ??
      templates.at(0) ??
      null;
    if (!template) {
      return null;
    }

    return toLabelTemplateView(template);
  },
});

export const getLabelUrlBase = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    const siteUrl = process.env.SITE_URL?.trim();
    return siteUrl ? siteUrl : null;
  },
});

export const ensureDefaultTemplates = mutation({
  args: {},
  returns: v.object({ seeded: v.boolean() }),
  handler: async (ctx) => {
    const actor = await requireAdminUser(ctx);
    return await ensureDefaultTemplatesExist(ctx, actor._id as Id<"users">);
  },
});

export const createTemplate = mutation({
  args: {
    name: v.string(),
    widthMm: v.number(),
    heightMm: v.number(),
    elements: v.array(labelTemplateElementValidator),
    isDefault: v.boolean(),
  },
  returns: v.object({ templateId: v.id("labelTemplates") }),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const normalized = normalizeLabelTemplateInput({
      name: args.name,
      widthMm: args.widthMm,
      heightMm: args.heightMm,
      elements: args.elements as LabelTemplateElementInput[],
    });
    await ensureReferencedCustomFieldsExist({
      ctx,
      elements: normalized.elements,
    });
    await requireUniqueName({
      ctx,
      normalizedName: normalized.normalizedName,
    });

    const existingTemplates = await listAllTemplates(ctx);
    const templateId = await ctx.db.insert("labelTemplates", {
      ...normalized,
      isDefault: args.isDefault || existingTemplates.length === 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: actor._id as Id<"users">,
      updatedBy: actor._id as Id<"users">,
    });

    if (args.isDefault || existingTemplates.length === 0) {
      await patchDefaultState({ ctx, templateId });
    }

    return { templateId };
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("labelTemplates"),
    name: v.string(),
    widthMm: v.number(),
    heightMm: v.number(),
    elements: v.array(labelTemplateElementValidator),
    isDefault: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const template = await requireTemplate(ctx, args.templateId);
    const normalized = normalizeLabelTemplateInput({
      name: args.name,
      widthMm: args.widthMm,
      heightMm: args.heightMm,
      elements: args.elements as LabelTemplateElementInput[],
    });
    await ensureReferencedCustomFieldsExist({
      ctx,
      elements: normalized.elements,
    });
    await requireUniqueName({
      ctx,
      normalizedName: normalized.normalizedName,
      templateId: template._id,
    });

    if (template.isDefault && !args.isDefault) {
      throwLabelTemplateError(
        "DEFAULT_TEMPLATE_REQUIRED",
        "Choose another default template before clearing this default",
      );
    }

    await ctx.db.patch(template._id, {
      ...normalized,
      isDefault: args.isDefault,
      updatedAt: Date.now(),
      updatedBy: actor._id as Id<"users">,
    });

    if (args.isDefault) {
      await patchDefaultState({ ctx, templateId: template._id });
    }

    return null;
  },
});

export const deleteTemplate = mutation({
  args: { templateId: v.id("labelTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const template = await requireTemplate(ctx, args.templateId);
    if (template.isDefault) {
      throwLabelTemplateError(
        "DEFAULT_TEMPLATE_REQUIRED",
        "The default label template cannot be deleted",
      );
    }

    await ctx.db.delete(template._id);
    return null;
  },
});

export const setDefaultTemplate = mutation({
  args: { templateId: v.id("labelTemplates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const template = await requireTemplate(ctx, args.templateId);
    await patchDefaultState({ ctx, templateId: template._id });
    return null;
  },
});
