import { apiFetch } from "@/lib/api-client";

export type LabelTemplateElement = Record<string, unknown>;

export type LabelTemplate = {
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

type TemplateInput = {
  name: string;
  widthMm: number;
  heightMm: number;
  elements: LabelTemplateElement[];
  isDefault: boolean;
};

export async function listLabelTemplates(): Promise<LabelTemplate[]> {
  const { templates } = await apiFetch<{ templates: LabelTemplate[] }>(
    "/api/label-templates",
  );
  return templates;
}

export async function getDefaultLabelTemplate(): Promise<LabelTemplate | null> {
  const { template } = await apiFetch<{ template: LabelTemplate | null }>(
    "/api/label-templates?variant=default",
  );
  return template;
}

export async function getLabelTemplate(
  templateId: string,
): Promise<LabelTemplate | null> {
  const { template } = await apiFetch<{ template: LabelTemplate | null }>(
    `/api/label-templates/${templateId}`,
  );
  return template;
}

export async function createLabelTemplate(
  input: TemplateInput,
): Promise<LabelTemplate> {
  const { template } = await apiFetch<{ template: LabelTemplate }>(
    "/api/label-templates",
    { method: "POST", body: input },
  );
  return template;
}

export async function updateLabelTemplate(
  templateId: string,
  input: TemplateInput,
): Promise<LabelTemplate> {
  const { template } = await apiFetch<{ template: LabelTemplate }>(
    `/api/label-templates/${templateId}`,
    { method: "PATCH", body: input },
  );
  return template;
}

export async function deleteLabelTemplate(templateId: string): Promise<void> {
  await apiFetch(`/api/label-templates/${templateId}`, { method: "DELETE" });
}

export async function setDefaultLabelTemplate(
  templateId: string,
): Promise<void> {
  await apiFetch(`/api/label-templates/${templateId}/default`, {
    method: "POST",
  });
}

export async function ensureDefaultLabelTemplates(): Promise<{
  seeded: boolean;
}> {
  return apiFetch<{ seeded: boolean }>("/api/label-templates/ensure-defaults", {
    method: "POST",
  });
}

export async function getLabelUrlBase(): Promise<string | null> {
  const { base } = await apiFetch<{ base: string | null }>(
    "/api/label-templates/url-base",
  );
  return base;
}
