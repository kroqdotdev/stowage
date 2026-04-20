import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import { getPbUrl } from "@/server/pb/client";
import {
  ATTACHMENT_KINDS,
  ATTACHMENT_STATUSES,
  MAX_ATTACHMENT_RETRY_ATTEMPTS,
  MAX_ATTACHMENT_UPLOAD_BYTES,
  classifyAttachment,
  sanitizeAttachmentFileName,
  type AttachmentKind,
  type AttachmentStatus,
} from "@/server/pb/attachments";
import { NotFoundError, ValidationError } from "@/server/pb/errors";
import { enforceStorageQuota } from "@/server/pb/storage-quota";

type AttachmentRecord = {
  id: string;
  assetId: string;
  storageFile: string | "";
  originalFile: string | "";
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: AttachmentKind;
  fileSizeOriginal: number;
  fileSizeOptimized: number | null;
  status: AttachmentStatus;
  optimizationAttempts: number;
  optimizationError: string | "";
  uploadedBy: string;
  uploadedAt: number;
  updatedAt: number;
};

export type AttachmentView = {
  id: string;
  assetId: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: AttachmentKind;
  fileSizeOriginal: number;
  fileSizeOptimized: number | null;
  status: AttachmentStatus;
  optimizationAttempts: number;
  optimizationError: string | null;
  uploadedBy: string;
  uploadedAt: number;
  updatedAt: number;
  url: string | null;
};

export const CreateAttachmentInput = z.object({
  assetId: z.string(),
  fileName: z.string(),
  fileType: z.string().nullish(),
  fileBuffer: z.instanceof(Uint8Array),
  actorId: z.string(),
});

export type CreateAttachmentInput = z.infer<typeof CreateAttachmentInput>;

function attachmentFileUrl(record: AttachmentRecord): string | null {
  if (!record.storageFile) return null;
  return `${getPbUrl()}/api/files/attachments/${record.id}/${encodeURIComponent(
    record.storageFile,
  )}`;
}

function toView(record: AttachmentRecord): AttachmentView {
  return {
    id: record.id,
    assetId: record.assetId,
    fileName: record.fileName,
    fileType: record.fileType,
    fileExtension: record.fileExtension,
    fileKind: record.fileKind,
    fileSizeOriginal: record.fileSizeOriginal,
    fileSizeOptimized: record.fileSizeOptimized ?? null,
    status: record.status,
    optimizationAttempts: record.optimizationAttempts ?? 0,
    optimizationError: record.optimizationError || null,
    uploadedBy: record.uploadedBy,
    uploadedAt: record.uploadedAt,
    updatedAt: record.updatedAt,
    url: attachmentFileUrl(record),
  };
}

async function requireAttachment(
  ctx: Ctx,
  attachmentId: string,
): Promise<AttachmentRecord> {
  try {
    return await ctx.pb
      .collection("attachments")
      .getOne<AttachmentRecord>(attachmentId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Attachment not found");
    }
    throw error;
  }
}

async function requireAssetExists(ctx: Ctx, assetId: string): Promise<void> {
  try {
    await ctx.pb.collection("assets").getOne(assetId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Asset not found");
    }
    throw error;
  }
}

export async function createAttachment(
  ctx: Ctx,
  input: CreateAttachmentInput,
): Promise<{ attachmentId: string }> {
  const parsed = CreateAttachmentInput.parse(input);
  await requireAssetExists(ctx, parsed.assetId);

  const fileName = sanitizeAttachmentFileName(parsed.fileName);
  const fileType = parsed.fileType || "application/octet-stream";
  const classification = classifyAttachment(fileName, fileType);
  const fileSize = parsed.fileBuffer.byteLength;
  const now = Date.now();

  await enforceStorageQuota(ctx, fileSize);

  if (fileSize > MAX_ATTACHMENT_UPLOAD_BYTES) {
    const form = new FormData();
    form.append("assetId", parsed.assetId);
    form.append("fileName", fileName);
    form.append("fileType", classification.mimeType);
    form.append("fileExtension", classification.extension);
    form.append("fileKind", classification.kind);
    form.append("fileSizeOriginal", String(fileSize));
    form.append("status", "failed");
    form.append("optimizationAttempts", "0");
    form.append(
      "optimizationError",
      "This file is too large. Upload files up to 25 MB.",
    );
    form.append("uploadedBy", parsed.actorId);
    form.append("uploadedAt", String(now));
    form.append("updatedAt", String(now));
    const record = await ctx.pb
      .collection("attachments")
      .create<AttachmentRecord>(form);
    return { attachmentId: record.id };
  }

  const blob = new Blob([new Uint8Array(parsed.fileBuffer)], {
    type: classification.mimeType,
  });

  const form = new FormData();
  form.append("assetId", parsed.assetId);
  form.append("storageFile", blob, fileName);
  form.append("originalFile", blob, fileName);
  form.append("fileName", fileName);
  form.append("fileType", classification.mimeType);
  form.append("fileExtension", classification.extension);
  form.append("fileKind", classification.kind);
  form.append("fileSizeOriginal", String(fileSize));
  form.append("status", "pending");
  form.append("optimizationAttempts", "0");
  form.append("uploadedBy", parsed.actorId);
  form.append("uploadedAt", String(now));
  form.append("updatedAt", String(now));

  const record = await ctx.pb
    .collection("attachments")
    .create<AttachmentRecord>(form);

  return { attachmentId: record.id };
}

export async function listAttachments(
  ctx: Ctx,
  assetId: string,
): Promise<AttachmentView[]> {
  await requireAssetExists(ctx, assetId);
  const records = await ctx.pb
    .collection("attachments")
    .getFullList<AttachmentRecord>({
      filter: `assetId = "${assetId}"`,
      sort: "-uploadedAt",
    });
  return records.map(toView);
}

export type AttachmentQueueStatus = {
  id: string;
  status: AttachmentStatus;
  optimizationError: string | null;
};

export async function listAttachmentQueueStatuses(
  ctx: Ctx,
  assetId: string,
): Promise<AttachmentQueueStatus[]> {
  await requireAssetExists(ctx, assetId);
  const records = await ctx.pb
    .collection("attachments")
    .getFullList<AttachmentRecord>({
      filter: `assetId = "${assetId}"`,
      sort: "-uploadedAt",
    });
  return records.map((row) => ({
    id: row.id,
    status: row.status,
    optimizationError: row.optimizationError || null,
  }));
}

export async function getAttachmentUrl(
  ctx: Ctx,
  attachmentId: string,
): Promise<string | null> {
  const record = await requireAttachment(ctx, attachmentId);
  return attachmentFileUrl(record);
}

export async function deleteAttachment(
  ctx: Ctx,
  attachmentId: string,
): Promise<void> {
  const attachment = await requireAttachment(ctx, attachmentId);
  await ctx.pb.collection("attachments").delete(attachment.id);
}

export async function retryAttachmentOptimization(
  ctx: Ctx,
  attachmentId: string,
): Promise<AttachmentView> {
  const attachment = await requireAttachment(ctx, attachmentId);
  if (attachment.status !== "failed" && attachment.status !== "pending") {
    throw new ValidationError(
      "This attachment is not in a retryable state.",
    );
  }
  const updated = await ctx.pb
    .collection("attachments")
    .update<AttachmentRecord>(attachment.id, {
      status: "pending",
      optimizationError: "",
      updatedAt: Date.now(),
    });
  return toView(updated);
}

// State transitions used by the optimization pipeline.

export type ProcessingStartResult =
  | { state: "started"; attempt: number; record: AttachmentRecord }
  | { state: "missing" }
  | { state: "skip"; attempt: number };

export async function markAttachmentProcessing(
  ctx: Ctx,
  attachmentId: string,
): Promise<ProcessingStartResult> {
  let attachment: AttachmentRecord;
  try {
    attachment = await ctx.pb
      .collection("attachments")
      .getOne<AttachmentRecord>(attachmentId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return { state: "missing" };
    }
    throw error;
  }

  if (attachment.status === "ready" || attachment.status === "processing") {
    return { state: "skip", attempt: attachment.optimizationAttempts ?? 0 };
  }

  const nextAttempt = (attachment.optimizationAttempts ?? 0) + 1;
  const updated = await ctx.pb
    .collection("attachments")
    .update<AttachmentRecord>(attachment.id, {
      status: "processing",
      optimizationAttempts: nextAttempt,
      optimizationError: "",
      updatedAt: Date.now(),
    });

  return { state: "started", attempt: nextAttempt, record: updated };
}

export async function markAttachmentReady(
  ctx: Ctx,
  {
    attachmentId,
    optimized,
    fileSizeOptimized,
  }: {
    attachmentId: string;
    optimized: {
      fileName: string;
      fileType: string;
      fileExtension: string;
      bytes: Uint8Array;
    } | null;
    fileSizeOptimized: number;
  },
): Promise<void> {
  const now = Date.now();

  if (optimized) {
    const blob = new Blob([new Uint8Array(optimized.bytes)], {
      type: optimized.fileType,
    });
    const form = new FormData();
    form.append("storageFile", blob, optimized.fileName);
    // Clear the original upload to reclaim space now that optimization is done.
    form.append("originalFile-", "");
    form.append("fileName", optimized.fileName);
    form.append("fileType", optimized.fileType);
    form.append("fileExtension", optimized.fileExtension);
    form.append("fileSizeOptimized", String(fileSizeOptimized));
    form.append("status", "ready");
    form.append("optimizationError", "");
    form.append("updatedAt", String(now));
    await ctx.pb.collection("attachments").update(attachmentId, form);
    return;
  }

  await ctx.pb.collection("attachments").update(attachmentId, {
    fileSizeOptimized,
    status: "ready",
    optimizationError: "",
    "originalFile-": "",
    updatedAt: now,
  });
}

export async function markAttachmentFailed(
  ctx: Ctx,
  {
    attachmentId,
    errorMessage,
    retryable = true,
  }: { attachmentId: string; errorMessage: string; retryable?: boolean },
): Promise<{ attempt: number; shouldRetry: boolean }> {
  let attachment: AttachmentRecord;
  try {
    attachment = await ctx.pb
      .collection("attachments")
      .getOne<AttachmentRecord>(attachmentId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return { attempt: 0, shouldRetry: false };
    }
    throw error;
  }

  await ctx.pb.collection("attachments").update(attachment.id, {
    status: "failed",
    optimizationError: errorMessage,
    updatedAt: Date.now(),
  });

  const attempt = attachment.optimizationAttempts ?? 0;
  return {
    attempt,
    shouldRetry: retryable && attempt < MAX_ATTACHMENT_RETRY_ATTEMPTS,
  };
}

export { ATTACHMENT_KINDS, ATTACHMENT_STATUSES };
