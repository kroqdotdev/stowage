export type AttachmentItem = {
  id: string;
  assetId: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: "image" | "pdf" | "office";
  fileSizeOriginal: number;
  fileSizeOptimized: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  optimizationAttempts: number;
  optimizationError: string | null;
  uploadedBy: string;
  uploadedAt: number;
  updatedAt: number;
  url: string | null;
};
