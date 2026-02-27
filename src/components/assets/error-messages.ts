import { getConvexUiErrorMessage } from "@/components/crud/error-messages"
import { getConvexErrorCode } from "@/lib/convex-errors"

export function getAssetUiErrorMessage(error: unknown, fallback: string) {
  const code = getConvexErrorCode(error)

  if (code === "INVALID_ASSET_NAME") {
    return "Asset name is required."
  }

  if (code === "CATEGORY_NOT_FOUND") {
    return "The selected category no longer exists."
  }

  if (code === "LOCATION_NOT_FOUND") {
    return "The selected location no longer exists."
  }

  if (code === "TAG_NOT_FOUND") {
    return "One or more selected tags no longer exist."
  }

  if (code === "REQUIRED_CUSTOM_FIELD") {
    return getConvexUiErrorMessage(error, "Fill in all required custom fields.")
  }

  if (code === "INVALID_CUSTOM_FIELD" || code === "INVALID_CUSTOM_FIELD_VALUE") {
    return getConvexUiErrorMessage(error, "A custom field value is invalid.")
  }

  if (code === "ASSET_NOT_FOUND") {
    return "Asset not found."
  }

  if (code === "FORBIDDEN") {
    return "You do not have permission to perform this action."
  }

  return getConvexUiErrorMessage(error, fallback)
}
