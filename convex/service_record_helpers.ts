import { ConvexError } from "convex/values";
import { requireIsoDate } from "./service_schedule_helpers";

export const SERVICE_GROUP_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "checkbox",
  "select",
] as const;

export type ServiceGroupFieldType = (typeof SERVICE_GROUP_FIELD_TYPES)[number];

type ServiceRecordErrorCode =
  | "FORBIDDEN"
  | "GROUP_NOT_FOUND"
  | "PROVIDER_NOT_FOUND"
  | "FIELD_NOT_FOUND"
  | "GROUP_IN_USE"
  | "PROVIDER_IN_USE"
  | "ASSET_NOT_FOUND"
  | "ASSET_GROUP_REQUIRED"
  | "RECORD_NOT_FOUND"
  | "SCHEDULE_NOT_FOUND"
  | "ATTACHMENT_NOT_FOUND"
  | "INVALID_FIELD_VALUE"
  | "INVALID_SERVICE_DATE"
  | "MISSING_REQUIRED_FIELD";

type RecordValue = string | number | boolean | null;

export function throwServiceRecordError(
  code: ServiceRecordErrorCode,
  message: string,
): never {
  throw new ConvexError({ code, message });
}

export function normalizeServiceName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeServiceNameKey(value: string) {
  return normalizeServiceName(value).toLocaleLowerCase();
}

export function normalizeOptionalServiceText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeServiceFieldLabel(value: string) {
  const normalized = normalizeServiceName(value);
  if (!normalized) {
    throwServiceRecordError("INVALID_FIELD_VALUE", "Field label is required");
  }
  return normalized;
}

export function normalizeServiceFieldOptions(options: string[]) {
  const deduped = new Map<string, string>();

  for (const option of options) {
    const normalized = normalizeServiceName(option);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLocaleLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, normalized);
    }
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
    throwServiceRecordError(
      "INVALID_FIELD_VALUE",
      "Select fields must include at least one option",
    );
  }

  return {
    label: normalizedLabel,
    normalizedLabel: normalizeServiceNameKey(normalizedLabel),
    options: normalizedOptions,
  };
}

function isEmptyValue(value: RecordValue | undefined) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return false;
}

type ServiceGroupFieldForValidation = {
  _id: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
};

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
      throwServiceRecordError(
        "FIELD_NOT_FOUND",
        "Record includes an unknown field",
      );
    }
  }

  const normalizedValues: Record<string, RecordValue> = {};

  for (const field of fields) {
    const rawValue = values[field._id];

    if (field.fieldType === "checkbox") {
      if (rawValue === undefined || rawValue === null) {
        if (field.required) {
          throwServiceRecordError(
            "MISSING_REQUIRED_FIELD",
            `${field.label} is required`,
          );
        }
        continue;
      }

      if (typeof rawValue !== "boolean") {
        throwServiceRecordError(
          "INVALID_FIELD_VALUE",
          `${field.label} must be true or false`,
        );
      }

      normalizedValues[field._id] = rawValue;
      continue;
    }

    if (isEmptyValue(rawValue)) {
      if (field.required) {
        throwServiceRecordError(
          "MISSING_REQUIRED_FIELD",
          `${field.label} is required`,
        );
      }
      continue;
    }

    if (field.fieldType === "number") {
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        throwServiceRecordError(
          "INVALID_FIELD_VALUE",
          `${field.label} must be a number`,
        );
      }
      normalizedValues[field._id] = rawValue;
      continue;
    }

    if (typeof rawValue !== "string") {
      throwServiceRecordError(
        "INVALID_FIELD_VALUE",
        `${field.label} must be text`,
      );
    }

    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      if (field.required) {
        throwServiceRecordError(
          "MISSING_REQUIRED_FIELD",
          `${field.label} is required`,
        );
      }
      continue;
    }

    if (field.fieldType === "date") {
      normalizedValues[field._id] = requireIsoDate(trimmedValue);
      continue;
    }

    if (field.fieldType === "select") {
      if (!field.options.includes(trimmedValue)) {
        throwServiceRecordError(
          "INVALID_FIELD_VALUE",
          `${field.label} contains an invalid option`,
        );
      }
      normalizedValues[field._id] = trimmedValue;
      continue;
    }

    normalizedValues[field._id] = trimmedValue;
  }

  return normalizedValues;
}
