import { ConvexError } from "convex/values";

export const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "dropdown",
  "checkbox",
  "url",
  "currency",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const APP_DATE_FORMATS = [
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY-MM-DD",
] as const;

export type AppDateFormat = (typeof APP_DATE_FORMATS)[number];

type AppErrorCode =
  | "FORBIDDEN"
  | "INVALID_FIELD_NAME"
  | "INVALID_DROPDOWN_OPTIONS"
  | "UNSAFE_TYPE_CHANGE"
  | "FIELD_IN_USE"
  | "INVALID_DATE_FORMAT";

export function throwAppError(code: AppErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}

export function requireCustomFieldName(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    throwAppError("INVALID_FIELD_NAME", "Field name is required");
  }
  return normalized;
}

export function normalizeDropdownOptions(options: string[] | undefined) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawOption of options ?? []) {
    const option = rawOption.trim();
    if (!option) {
      continue;
    }

    const key = option.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(option);
  }

  return normalized;
}

export function normalizeFieldOptions(
  fieldType: CustomFieldType,
  options: string[] | undefined,
) {
  if (fieldType !== "dropdown") {
    return [] as string[];
  }

  const normalized = normalizeDropdownOptions(options);
  if (normalized.length === 0) {
    throwAppError(
      "INVALID_DROPDOWN_OPTIONS",
      "Dropdown fields require at least one option",
    );
  }

  return normalized;
}

export function isSafeFieldTypeChange(
  from: CustomFieldType,
  to: CustomFieldType,
) {
  if (from === to) {
    return true;
  }

  if (
    (from === "number" && to === "currency") ||
    (from === "currency" && to === "number")
  ) {
    return true;
  }

  if ((from === "text" && to === "url") || (from === "url" && to === "text")) {
    return true;
  }

  return false;
}

export function ensureSafeTypeChange(
  currentType: CustomFieldType,
  nextType: CustomFieldType,
  usageCount: number,
) {
  if (currentType === nextType) {
    return;
  }

  if (usageCount > 0 && !isSafeFieldTypeChange(currentType, nextType)) {
    throwAppError(
      "UNSAFE_TYPE_CHANGE",
      "This field has saved values. Create a new field instead of changing to an incompatible type.",
    );
  }
}

export function ensureFieldNotInUse(usageCount: number) {
  if (usageCount > 0) {
    throwAppError("FIELD_IN_USE", "This field is in use and cannot be deleted");
  }
}

export function requireAppDateFormat(format: string): AppDateFormat {
  if ((APP_DATE_FORMATS as readonly string[]).includes(format)) {
    return format as AppDateFormat;
  }

  throwAppError("INVALID_DATE_FORMAT", "Unsupported date format");
}
