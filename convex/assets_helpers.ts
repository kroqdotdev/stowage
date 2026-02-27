import { ConvexError } from "convex/values"

export const ASSET_STATUSES = [
  "active",
  "in_storage",
  "under_repair",
  "retired",
  "disposed",
] as const

export type AssetStatus = (typeof ASSET_STATUSES)[number]

type AssetErrorCode =
  | "FORBIDDEN"
  | "ASSET_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "LOCATION_NOT_FOUND"
  | "TAG_NOT_FOUND"
  | "INVALID_ASSET_NAME"
  | "INVALID_ASSET_STATUS"
  | "INVALID_ASSET_TAG"
  | "INVALID_CUSTOM_FIELD"
  | "INVALID_CUSTOM_FIELD_VALUE"
  | "REQUIRED_CUSTOM_FIELD"

export type AssetCustomFieldValue = string | number | boolean | null

const ASSET_TAG_WIDTH = 4
const ASSET_TAG_DEFAULT_PREFIX = "AST"
const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function throwAssetError(code: AssetErrorCode, message: string): never {
  throw new ConvexError({ code, message })
}

export function requireAssetName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ")
  if (!normalized) {
    throwAssetError("INVALID_ASSET_NAME", "Asset name is required")
  }
  return normalized
}

export function normalizeAssetNameKey(name: string) {
  return name.trim().toLocaleLowerCase()
}

export function normalizeAssetNotes(notes: string | null | undefined) {
  if (notes == null) {
    return null
  }

  const normalized = notes.trim()
  return normalized ? normalized : null
}

function sanitizeTagPrefix(rawPrefix: string) {
  const normalized = rawPrefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized
}

export function normalizeAssetTagPrefix(prefix: string | null | undefined) {
  if (!prefix) {
    return ASSET_TAG_DEFAULT_PREFIX
  }

  const normalized = sanitizeTagPrefix(prefix)
  if (!normalized) {
    return ASSET_TAG_DEFAULT_PREFIX
  }

  return normalized
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function buildAssetTag(prefix: string, number: number) {
  if (!Number.isInteger(number) || number < 1) {
    throwAssetError("INVALID_ASSET_TAG", "Asset tag sequence must be a positive integer")
  }

  return `${prefix}-${String(number).padStart(ASSET_TAG_WIDTH, "0")}`
}

export function getAssetTagNumber(assetTag: string, prefix: string) {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`)
  const match = assetTag.match(pattern)
  if (!match) {
    return null
  }

  const parsed = Number(match[1])
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null
  }

  return parsed
}

export function normalizeCustomFieldValues(
  rawValues: Record<string, AssetCustomFieldValue> | undefined,
) {
  if (!rawValues) {
    return {} as Record<string, AssetCustomFieldValue>
  }

  const normalized: Record<string, AssetCustomFieldValue> = {}
  for (const [fieldId, value] of Object.entries(rawValues)) {
    const trimmedFieldId = fieldId.trim()
    if (!trimmedFieldId) {
      continue
    }

    normalized[trimmedFieldId] = value
  }

  return normalized
}

export function isIsoDateOnly(value: string) {
  if (!ISO_DATE_ONLY_PATTERN.test(value)) {
    return false
  }

  const [yearRaw, monthRaw, dayRaw] = value.split("-")
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }

  const candidate = new Date(Date.UTC(year, month - 1, day))
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  )
}

export function isCustomFieldValueEmpty(value: AssetCustomFieldValue | undefined) {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === "string") {
    return value.trim() === ""
  }

  return false
}

export function isCustomFieldValueSet(value: AssetCustomFieldValue | undefined) {
  return !isCustomFieldValueEmpty(value)
}
