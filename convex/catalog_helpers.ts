import { ConvexError } from "convex/values";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function expandShortHex(hex: string) {
  if (hex.length !== 4) {
    return hex;
  }

  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`;
}

export function normalizeCatalogName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function requireCatalogName(value: string) {
  const normalized = normalizeCatalogName(value);
  if (!normalized) {
    throw new ConvexError("Name is required");
  }
  return normalized;
}

export function normalizeCatalogNameKey(value: string) {
  return normalizeCatalogName(value).toLowerCase();
}

export function normalizeOptionalText(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

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
    throw new ConvexError("Enter a valid hex color");
  }

  return expandShortHex(prefixed).toUpperCase();
}
