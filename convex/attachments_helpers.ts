import { ConvexError } from "convex/values"

export const ATTACHMENT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const

export type AttachmentStatus = (typeof ATTACHMENT_STATUSES)[number]

export const ATTACHMENT_KINDS = ["image", "pdf", "office"] as const
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number]

type AttachmentErrorCode =
  | "ASSET_NOT_FOUND"
  | "ATTACHMENT_NOT_FOUND"
  | "INVALID_FILE_NAME"
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "UPLOAD_NOT_FOUND"
  | "OPTIMIZATION_FAILED"
  | "RETRY_NOT_ALLOWED"

export const MAX_ATTACHMENT_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_ATTACHMENT_RETRY_ATTEMPTS = 3
export const IMAGE_MAX_LONG_EDGE = 1600
export const IMAGE_TARGET_BYTES = 150 * 1024

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
])

const PDF_EXTENSIONS = new Set(["pdf"])

const OFFICE_EXTENSIONS = new Set([
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
])

const PDF_MIME_TYPES = new Set(["application/pdf"])

const OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

export function throwAttachmentError(code: AttachmentErrorCode, message: string): never {
  throw new ConvexError({ code, message })
}

export function sanitizeAttachmentFileName(fileName: string) {
  const trimmed = fileName.trim()
  if (!trimmed) {
    throwAttachmentError("INVALID_FILE_NAME", "File name is required")
  }

  const withoutPath = trimmed.split(/[\\/]/).pop() ?? ""
  const normalized = withoutPath.replace(/\s+/g, " ").trim()
  if (!normalized) {
    throwAttachmentError("INVALID_FILE_NAME", "File name is required")
  }

  return normalized
}

export function getAttachmentExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".")
  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return null
  }

  return fileName.slice(dotIndex + 1).toLocaleLowerCase()
}

function normalizeMimeType(fileType: string | null | undefined) {
  if (!fileType) {
    return ""
  }

  return fileType.split(";")[0]?.trim().toLocaleLowerCase() ?? ""
}

export function classifyAttachment(fileName: string, fileType: string | null | undefined) {
  const extension = getAttachmentExtension(fileName)
  if (!extension) {
    throwAttachmentError(
      "INVALID_FILE_TYPE",
      "Unsupported file type. Upload images, PDFs, or Office files.",
    )
  }

  const normalizedMimeType = normalizeMimeType(fileType)

  if (IMAGE_EXTENSIONS.has(extension)) {
    if (normalizedMimeType && !normalizedMimeType.startsWith("image/")) {
      throwAttachmentError(
        "INVALID_FILE_TYPE",
        "Unsupported image type. Upload images, PDFs, or Office files.",
      )
    }
    return {
      kind: "image" as AttachmentKind,
      extension,
      mimeType: normalizedMimeType || "image/jpeg",
    }
  }

  if (PDF_EXTENSIONS.has(extension)) {
    if (normalizedMimeType && !PDF_MIME_TYPES.has(normalizedMimeType)) {
      throwAttachmentError(
        "INVALID_FILE_TYPE",
        "Unsupported PDF type. Upload images, PDFs, or Office files.",
      )
    }
    return {
      kind: "pdf" as AttachmentKind,
      extension,
      mimeType: "application/pdf",
    }
  }

  if (OFFICE_EXTENSIONS.has(extension)) {
    if (
      normalizedMimeType &&
      normalizedMimeType !== "application/octet-stream" &&
      !OFFICE_MIME_TYPES.has(normalizedMimeType)
    ) {
      throwAttachmentError(
        "INVALID_FILE_TYPE",
        "Unsupported Office file type. Upload images, PDFs, or Office files.",
      )
    }

    return {
      kind: "office" as AttachmentKind,
      extension,
      mimeType: normalizedMimeType || "application/octet-stream",
    }
  }

  throwAttachmentError(
    "INVALID_FILE_TYPE",
    "Unsupported file type. Upload images, PDFs, or Office files.",
  )
}

export function replaceAttachmentExtension(fileName: string, nextExtension: string) {
  const extension = getAttachmentExtension(fileName)
  if (!extension) {
    return `${fileName}.${nextExtension}`
  }

  return `${fileName.slice(0, -(extension.length + 1))}.${nextExtension}`
}

export function getAttachmentRetryDelayMs(attempt: number) {
  if (attempt <= 1) {
    return 5_000
  }

  if (attempt === 2) {
    return 20_000
  }

  return 60_000
}

export function normalizeOptimizationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 240)
  }

  return "Attachment optimization failed"
}
