import { ValidationError } from "./errors";

export const SERVICE_GROUP_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "checkbox",
  "select",
] as const;

export type ServiceGroupFieldType = (typeof SERVICE_GROUP_FIELD_TYPES)[number];

export function normalizeServiceName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length > 200) {
    throw new ValidationError("Name must be 200 characters or fewer");
  }
  return normalized;
}

export function normalizeServiceNameKey(value: string) {
  return normalizeServiceName(value).toLocaleLowerCase();
}

export function normalizeOptionalServiceText(
  value: string | null | undefined,
) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeServiceFieldLabel(value: string) {
  const normalized = normalizeServiceName(value);
  if (!normalized) {
    throw new ValidationError("Field label is required");
  }
  return normalized;
}

export function normalizeServiceFieldOptions(options: string[]) {
  const deduped = new Map<string, string>();
  for (const option of options) {
    const normalized = normalizeServiceName(option);
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (!deduped.has(key)) deduped.set(key, normalized);
  }
  return Array.from(deduped.values());
}

export function normalizeServiceFieldInput({
  label,
  fieldType,
  options,
}: {
  label: string;
  fieldType: ServiceGroupFieldType;
  options: string[];
}) {
  const normalizedLabel = normalizeServiceFieldLabel(label);
  if (fieldType !== "select") {
    return {
      label: normalizedLabel,
      normalizedLabel: normalizeServiceNameKey(normalizedLabel),
      options: [] as string[],
    };
  }

  const normalizedOptions = normalizeServiceFieldOptions(options);
  if (normalizedOptions.length === 0) {
    throw new ValidationError(
      "Select fields must include at least one option",
    );
  }

  return {
    label: normalizedLabel,
    normalizedLabel: normalizeServiceNameKey(normalizedLabel),
    options: normalizedOptions,
  };
}
