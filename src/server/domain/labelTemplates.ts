import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  createDefaultLabelTemplateDefinitions,
  LABEL_ELEMENT_TYPES,
  LABEL_FONT_WEIGHT_OPTIONS,
  LABEL_TEXT_ALIGN_OPTIONS,
  type LabelTemplateElement,
  type LabelTemplateElementInput,
  normalizeLabelTemplateInput,
} from "@/server/pb/label-templates";

const labelElementSchema = z.object({
  id: z.string(),
  type: z.enum(LABEL_ELEMENT_TYPES),
  xMm: z.number(),
  yMm: z.number(),
  widthMm: z.number(),
  heightMm: z.number(),
  fontSize: z.number().optional(),
  fontWeight: z.enum(LABEL_FONT_WEIGHT_OPTIONS).optional(),
  textAlign: z.enum(LABEL_TEXT_ALIGN_OPTIONS).optional(),
  fieldId: z.string().nullish(),
  text: z.string().nullish(),
  uppercase: z.boolean().optional(),
});

export const CreateTemplateInput = z.object({
  name: z.string(),
  widthMm: z.number(),
  heightMm: z.number(),
  elements: z.array(labelElementSchema),
  isDefault: z.boolean(),
  actorId: z.string(),
});

export const UpdateTemplateInput = CreateTemplateInput.extend({
  templateId: z.string(),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateInput>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateInput>;

export type LabelTemplateView = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  elements: LabelTemplateElement[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

type LabelTemplateRecord = {
  id: string;
  name: string;
  normalizedName: string;
  widthMm: number;
  heightMm: number;
  elements: LabelTemplateElement[] | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

function toView(record: LabelTemplateRecord): LabelTemplateView {
  return {
    id: record.id,
    name: record.name,
    widthMm: record.widthMm,
    heightMm: record.heightMm,
    elements: Array.isArray(record.elements) ? record.elements : [],
    isDefault: !!record.isDefault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}

function sortTemplates(records: LabelTemplateRecord[]) {
  return records.slice().sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

async function listAll(ctx: Ctx) {
  return ctx.pb
    .collection("labelTemplates")
    .getFullList<LabelTemplateRecord>();
}

async function loadTemplate(
  ctx: Ctx,
  templateId: string,
): Promise<LabelTemplateRecord> {
  try {
    return await ctx.pb
      .collection("labelTemplates")
      .getOne<LabelTemplateRecord>(templateId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Label template not found");
    }
    throw error;
  }
}

async function assertUniqueName(
  ctx: Ctx,
  normalizedName: string,
  excludeId?: string,
) {
  const matches = await ctx.pb
    .collection("labelTemplates")
    .getList<LabelTemplateRecord>(1, 2, {
      filter: `normalizedName = "${normalizedName.replace(/"/g, '\\"')}"`,
    });
  const duplicate = matches.items.find((row) => row.id !== excludeId);
  if (duplicate) {
    throw new ConflictError(
      "A label template with this name already exists",
    );
  }
}

async function ensureCustomFieldsExist(
  ctx: Ctx,
  elements: LabelTemplateElement[],
) {
  const ids = Array.from(
    new Set(
      elements
        .filter((element) => element.type === "customField")
        .map((element) => element.fieldId)
        .filter((id): id is string => !!id),
    ),
  );
  for (const id of ids) {
    try {
      await ctx.pb.collection("customFieldDefinitions").getOne(id);
    } catch (error) {
      if (error instanceof ClientResponseError && error.status === 404) {
        throw new ValidationError(`Referenced custom field is missing: ${id}`);
      }
      throw error;
    }
  }
}

async function patchDefaultState(ctx: Ctx, templateId: string) {
  const currentDefault = await ctx.pb
    .collection("labelTemplates")
    .getList<LabelTemplateRecord>(1, 1, { filter: "isDefault = true" });
  const current = currentDefault.items[0];
  if (current && current.id !== templateId) {
    await ctx.pb
      .collection("labelTemplates")
      .update(current.id, { isDefault: false });
  }
  await ctx.pb
    .collection("labelTemplates")
    .update(templateId, { isDefault: true });
}

export async function listTemplates(
  ctx: Ctx,
): Promise<LabelTemplateView[]> {
  return sortTemplates(await listAll(ctx)).map(toView);
}

export async function getTemplate(
  ctx: Ctx,
  templateId: string,
): Promise<LabelTemplateView | null> {
  try {
    const record = await ctx.pb
      .collection("labelTemplates")
      .getOne<LabelTemplateRecord>(templateId);
    return toView(record);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getDefaultTemplate(
  ctx: Ctx,
): Promise<LabelTemplateView | null> {
  const templates = sortTemplates(await listAll(ctx));
  const template =
    templates.find((candidate) => candidate.isDefault) ??
    templates[0] ??
    null;
  return template ? toView(template) : null;
}

export function getLabelUrlBase(): string | null {
  const siteUrl = process.env.SITE_URL?.trim();
  return siteUrl ? siteUrl : null;
}

export async function ensureDefaultTemplates(
  ctx: Ctx,
  actorId: string,
): Promise<{ seeded: boolean }> {
  const existing = await listAll(ctx);
  const byName = new Map(existing.map((t) => [t.normalizedName, t]));
  const now = Date.now();
  let seeded = false;
  let defaultId =
    existing.find((t) => t.isDefault)?.id ?? null;

  for (const template of createDefaultLabelTemplateDefinitions()) {
    const match = byName.get(template.normalizedName);
    if (match) {
      if (template.isDefault && !defaultId) defaultId = match.id;
      continue;
    }
    const created = await ctx.pb
      .collection("labelTemplates")
      .create<LabelTemplateRecord>({
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
    byName.set(template.normalizedName, created);
    seeded = true;
    if (template.isDefault && !defaultId) defaultId = created.id;
  }

  if (!defaultId) {
    const fallback =
      byName.get("thermal 57x32 mm") ??
      Array.from(byName.values())[0] ??
      null;
    defaultId = fallback?.id ?? null;
  }

  if (defaultId) await patchDefaultState(ctx, defaultId);
  return { seeded };
}

export async function createTemplate(
  ctx: Ctx,
  input: CreateTemplateInput,
): Promise<LabelTemplateView> {
  const parsed = CreateTemplateInput.parse(input);
  const normalized = normalizeLabelTemplateInput({
    name: parsed.name,
    widthMm: parsed.widthMm,
    heightMm: parsed.heightMm,
    elements: parsed.elements as LabelTemplateElementInput[],
  });
  await ensureCustomFieldsExist(ctx, normalized.elements);
  await assertUniqueName(ctx, normalized.normalizedName);

  const all = await listAll(ctx);
  const now = Date.now();
  const isDefault = parsed.isDefault || all.length === 0;

  const record = await ctx.pb
    .collection("labelTemplates")
    .create<LabelTemplateRecord>({
      ...normalized,
      isDefault,
      createdAt: now,
      updatedAt: now,
      createdBy: parsed.actorId,
      updatedBy: parsed.actorId,
    });

  if (isDefault) await patchDefaultState(ctx, record.id);

  return toView({ ...record, isDefault });
}

export async function updateTemplate(
  ctx: Ctx,
  input: UpdateTemplateInput,
): Promise<LabelTemplateView> {
  const parsed = UpdateTemplateInput.parse(input);
  const template = await loadTemplate(ctx, parsed.templateId);
  const normalized = normalizeLabelTemplateInput({
    name: parsed.name,
    widthMm: parsed.widthMm,
    heightMm: parsed.heightMm,
    elements: parsed.elements as LabelTemplateElementInput[],
  });
  await ensureCustomFieldsExist(ctx, normalized.elements);
  await assertUniqueName(ctx, normalized.normalizedName, template.id);

  if (template.isDefault && !parsed.isDefault) {
    throw new ConflictError(
      "Choose another default template before clearing this default",
    );
  }

  const updated = await ctx.pb
    .collection("labelTemplates")
    .update<LabelTemplateRecord>(template.id, {
      ...normalized,
      isDefault: parsed.isDefault,
      updatedAt: Date.now(),
      updatedBy: parsed.actorId,
    });

  if (parsed.isDefault) await patchDefaultState(ctx, template.id);

  return toView(updated);
}

export async function deleteTemplate(
  ctx: Ctx,
  templateId: string,
): Promise<void> {
  const template = await loadTemplate(ctx, templateId);
  if (template.isDefault) {
    throw new ConflictError(
      "The default label template cannot be deleted",
    );
  }
  await ctx.pb.collection("labelTemplates").delete(template.id);
}

export async function setDefaultTemplate(
  ctx: Ctx,
  templateId: string,
): Promise<void> {
  const template = await loadTemplate(ctx, templateId);
  await patchDefaultState(ctx, template.id);
}
