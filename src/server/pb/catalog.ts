import { ValidationError } from "./errors";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function requireMaxLength(
  value: string,
  maxLength: number,
  fieldName: string,
) {
  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be ${maxLength} characters or fewer`,
    );
  }
}

function expandShortHex(hex: string) {
  if (hex.length !== 4) return hex;
  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`;
}

export function normalizeCatalogName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function requireCatalogName(value: string) {
  const normalized = normalizeCatalogName(value);
  if (!normalized) throw new ValidationError("Name is required");
  requireMaxLength(normalized, 200, "Name");
  return normalized;
}

export function normalizeCatalogNameKey(value: string) {
  return normalizeCatalogName(value).toLowerCase();
}

export function normalizeOptionalText(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizePrefix(value: string | null | undefined) {
  return normalizeOptionalText(value);
}

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_COLOR_PATTERN.test(prefixed)) {
    throw new ValidationError("Enter a valid hex color");
  }
  return expandShortHex(prefixed).toUpperCase();
}
