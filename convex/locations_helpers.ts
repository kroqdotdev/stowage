import { ConvexError } from "convex/values"
import { normalizeCatalogName, normalizeOptionalText } from "./catalog_helpers"

export const LOCATION_PATH_SEPARATOR = " / "

export function requireLocationName(value: string) {
  const normalized = normalizeCatalogName(value)
  if (!normalized) {
    throw new ConvexError("Location name is required")
  }
  return normalized
}

export function normalizeLocationDescription(value: string | null | undefined) {
  return normalizeOptionalText(value)
}

export function computeLocationPath(parentPath: string | null, name: string) {
  return parentPath ? `${parentPath}${LOCATION_PATH_SEPARATOR}${name}` : name
}

export function replaceLocationPathPrefix(
  existingPath: string,
  oldPrefix: string,
  newPrefix: string,
) {
  if (existingPath === oldPrefix) {
    return newPrefix
  }

  const childPrefix = `${oldPrefix}${LOCATION_PATH_SEPARATOR}`
  if (!existingPath.startsWith(childPrefix)) {
    return existingPath
  }

  return `${newPrefix}${existingPath.slice(oldPrefix.length)}`
}

export function normalizeLocationNameKey(value: string) {
  return normalizeCatalogName(value).toLowerCase()
}

export function wouldCreateLocationCycle(
  locationId: string,
  nextParentId: string | null,
  byId: Map<string, { _id: string; parentId: string | null }>,
) {
  let cursor = nextParentId

  while (cursor) {
    if (cursor === locationId) {
      return true
    }

    const node = byId.get(cursor)
    if (!node) {
      break
    }
    cursor = node.parentId
  }

  return false
}
