import { apiFetch } from "@/lib/api-client";

export type AttachmentView = {
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

export async function listAttachments(
  assetId: string,
): Promise<AttachmentView[]> {
  const { attachments } = await apiFetch<{ attachments: AttachmentView[] }>(
    `/api/attachments?assetId=${encodeURIComponent(assetId)}`,
  );
  return attachments;
}

export async function uploadAttachment(
  assetId: string,
  file: File,
): Promise<{ attachmentId: string }> {
  const form = new FormData();
  form.append("assetId", assetId);
  form.append("file", file);
  return apiFetch<{ attachmentId: string }>("/api/attachments", {
    method: "POST",
    body: form,
  });
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiFetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
}

export async function retryAttachment(attachmentId: string): Promise<void> {
  await apiFetch(`/api/attachments/${attachmentId}/optimize`, {
    method: "POST",
  });
}

export type ServiceRecordAttachmentView = {
  id: string;
  serviceRecordId: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: "image" | "pdf" | "office";
  fileSize: number;
  uploadedBy: string;
  uploadedAt: number;
  updatedAt: number;
  url: string | null;
};

export async function listServiceRecordAttachments(
  serviceRecordId: string,
): Promise<ServiceRecordAttachmentView[]> {
  const { attachments } = await apiFetch<{
    attachments: ServiceRecordAttachmentView[];
  }>(
    `/api/service-record-attachments?serviceRecordId=${encodeURIComponent(
      serviceRecordId,
    )}`,
  );
  return attachments;
}

export async function uploadServiceRecordAttachment(
  serviceRecordId: string,
  file: File,
): Promise<{ attachmentId: string }> {
  const form = new FormData();
  form.append("serviceRecordId", serviceRecordId);
  form.append("file", file);
  return apiFetch<{ attachmentId: string }>("/api/service-record-attachments", {
    method: "POST",
    body: form,
  });
}

export async function deleteServiceRecordAttachment(
  attachmentId: string,
): Promise<void> {
  await apiFetch(`/api/service-record-attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function getStorageUsage(): Promise<{
  usedBytes: number;
  limitBytes: number | null;
}> {
  const { usage } = await apiFetch<{
    usage: { usedBytes: number; limitBytes: number | null };
  }>("/api/storage-usage");
  return usage;
}
