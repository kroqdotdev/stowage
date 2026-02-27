import { getConvexUiErrorMessage } from "@/components/crud/error-messages"
import { getConvexErrorCode } from "@/lib/convex-errors"

export function getAttachmentUiErrorMessage(error: unknown, fallback: string) {
  const code = getConvexErrorCode(error)

  if (code === "ASSET_NOT_FOUND") {
    return "Asset not found."
  }

  if (code === "ATTACHMENT_NOT_FOUND") {
    return "Attachment not found."
  }

  if (code === "INVALID_FILE_TYPE") {
    return "Unsupported file type. Upload images, PDFs, or Office files."
  }

  if (code === "FILE_TOO_LARGE") {
    return "This file is too large. Upload files up to 25 MB."
  }

  if (code === "UPLOAD_NOT_FOUND") {
    return "Uploaded file could not be processed."
  }

  if (code === "RETRY_NOT_ALLOWED") {
    return "This attachment cannot be retried right now."
  }

  return getConvexUiErrorMessage(error, fallback)
}
