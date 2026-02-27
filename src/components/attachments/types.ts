import type { Id } from "@/lib/convex-api"

export type AttachmentItem = {
  _id: Id<"attachments">
  _creationTime: number
  assetId: Id<"assets">
  fileName: string
  fileType: string
  fileExtension: string
  fileKind: "image" | "pdf" | "office"
  fileSizeOriginal: number
  fileSizeOptimized: number | null
  status: "pending" | "processing" | "ready" | "failed"
  optimizationAttempts: number
  optimizationError: string | null
  uploadedBy: Id<"users">
  uploadedAt: number
  updatedAt: number
  url: string | null
}
