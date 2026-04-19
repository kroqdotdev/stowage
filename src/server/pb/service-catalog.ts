import { ValidationError } from "./errors";
import { requireIsoDate } from "./service-schedule";

type RecordValue = string | number | boolean | null;

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

type ServiceGroupFieldForValidation = {
  _id: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
};

function isEmptyValue(value: RecordValue | undefined) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

export function normalizeServiceRecordValues({
  fields,
  values,
}: {
  fields: ServiceGroupFieldForValidation[];
  values: Record<string, RecordValue>;
}) {
  const fieldById = new Map(fields.map((field) => [field._id, field]));
  for (const key of Object.keys(values)) {
    if (!fieldById.has(key)) {
      throw new ValidationError("Record includes an unknown field");
    }
  }

  const out: Record<string, RecordValue> = {};
  for (const field of fields) {
    const raw = values[field._id];

    if (field.fieldType === "checkbox") {
      if (raw === undefined || raw === null) {
        if (field.required) {
          throw new ValidationError(`${field.label} is required`);
        }
        continue;
      }
      if (typeof raw !== "boolean") {
        throw new ValidationError(`${field.label} must be true or false`);
      }
      out[field._id] = raw;
      continue;
    }

    if (isEmptyValue(raw)) {
      if (field.required) {
        throw new ValidationError(`${field.label} is required`);
      }
      continue;
    }

    if (field.fieldType === "number") {
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        throw new ValidationError(`${field.label} must be a number`);
      }
      out[field._id] = raw;
      continue;
    }

    if (typeof raw !== "string") {
      throw new ValidationError(`${field.label} must be text`);
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      if (field.required) {
        throw new ValidationError(`${field.label} is required`);
      }
      continue;
    }

    if (trimmed.length > 2000) {
      throw new ValidationError(
        `${field.label} must be 2000 characters or fewer`,
      );
    }

    if (field.fieldType === "date") {
      out[field._id] = requireIsoDate(trimmed);
      continue;
    }

    if (field.fieldType === "select") {
      if (!field.options.includes(trimmed)) {
        throw new ValidationError(
          `${field.label} contains an invalid option`,
        );
      }
      out[field._id] = trimmed;
      continue;
    }

    out[field._id] = trimmed;
  }

  return out;
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
