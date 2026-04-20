import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import { getPbPublicUrl } from "@/server/pb/client";
import {
  MAX_ATTACHMENT_UPLOAD_BYTES,
  classifyAttachment,
  sanitizeAttachmentFileName,
  type AttachmentKind,
} from "@/server/pb/attachments";
import { NotFoundError, ValidationError } from "@/server/pb/errors";
import { enforceStorageQuota } from "@/server/pb/storage-quota";

type ServiceRecordAttachmentRecord = {
  id: string;
  serviceRecordId: string;
  storageFile: string | "";
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: AttachmentKind;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: number;
  updatedAt: number;
};

type ServiceRecordRow = { id: string; completedBy: string };

export type ServiceRecordAttachmentView = {
  id: string;
  serviceRecordId: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: AttachmentKind;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: number;
  updatedAt: number;
  url: string | null;
};

export const CreateServiceRecordAttachmentInput = z.object({
  serviceRecordId: z.string(),
  fileName: z.string(),
  fileType: z.string().nullish(),
  fileBuffer: z.instanceof(Uint8Array),
  actorId: z.string(),
  actorRole: z.enum(["admin", "user"]).default("user"),
});

export type CreateServiceRecordAttachmentInput = z.infer<
  typeof CreateServiceRecordAttachmentInput
>;

function fileUrl(record: ServiceRecordAttachmentRecord): string | null {
  if (!record.storageFile) return null;
  return `${getPbPublicUrl()}/api/files/serviceRecordAttachments/${record.id}/${encodeURIComponent(
    record.storageFile,
  )}`;
}

function toView(
  record: ServiceRecordAttachmentRecord,
): ServiceRecordAttachmentView {
  return {
    id: record.id,
    serviceRecordId: record.serviceRecordId,
    fileName: record.fileName,
    fileType: record.fileType,
    fileExtension: record.fileExtension,
    fileKind: record.fileKind,
    fileSize: record.fileSize,
    uploadedBy: record.uploadedBy,
    uploadedAt: record.uploadedAt,
    updatedAt: record.updatedAt,
    url: fileUrl(record),
  };
}

async function requireServiceRecord(
  ctx: Ctx,
  serviceRecordId: string,
): Promise<ServiceRecordRow> {
  try {
    return await ctx.pb
      .collection("serviceRecords")
      .getOne<ServiceRecordRow>(serviceRecordId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Service record not found");
    }
    throw error;
  }
}

function ensureMutationAccess(
  record: ServiceRecordRow,
  actor: { id: string; role: "admin" | "user" },
) {
  if (actor.role === "admin") return;
  if (record.completedBy !== actor.id) {
    throw new ValidationError(
      "You do not have access to modify this service record attachment",
    );
  }
}

async function requireAttachment(
  ctx: Ctx,
  attachmentId: string,
): Promise<ServiceRecordAttachmentRecord> {
  try {
    return await ctx.pb
      .collection("serviceRecordAttachments")
      .getOne<ServiceRecordAttachmentRecord>(attachmentId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Service record attachment not found");
    }
    throw error;
  }
}

export async function createServiceRecordAttachment(
  ctx: Ctx,
  input: CreateServiceRecordAttachmentInput,
): Promise<{ attachmentId: string }> {
  const parsed = CreateServiceRecordAttachmentInput.parse(input);
  const record = await requireServiceRecord(ctx, parsed.serviceRecordId);
  ensureMutationAccess(record, {
    id: parsed.actorId,
    role: parsed.actorRole,
  });

  const fileSize = parsed.fileBuffer.byteLength;
  await enforceStorageQuota(ctx, fileSize);

  if (fileSize > MAX_ATTACHMENT_UPLOAD_BYTES) {
    throw new ValidationError(
      "This file is too large. Upload files up to 25 MB.",
    );
  }

  const fileName = sanitizeAttachmentFileName(parsed.fileName);
  const fileType = parsed.fileType || "application/octet-stream";
  const classification = classifyAttachment(fileName, fileType);
  const now = Date.now();

  const blob = new Blob([new Uint8Array(parsed.fileBuffer)], {
    type: classification.mimeType,
  });
  const form = new FormData();
  form.append("serviceRecordId", parsed.serviceRecordId);
  form.append("storageFile", blob, fileName);
  form.append("fileName", fileName);
  form.append("fileType", classification.mimeType);
  form.append("fileExtension", classification.extension);
  form.append("fileKind", classification.kind);
  form.append("fileSize", String(fileSize));
  form.append("uploadedBy", parsed.actorId);
  form.append("uploadedAt", String(now));
  form.append("updatedAt", String(now));

  const created = await ctx.pb
    .collection("serviceRecordAttachments")
    .create<ServiceRecordAttachmentRecord>(form);
  return { attachmentId: created.id };
}

export async function listServiceRecordAttachments(
  ctx: Ctx,
  serviceRecordId: string,
): Promise<ServiceRecordAttachmentView[]> {
  await requireServiceRecord(ctx, serviceRecordId);
  const records = await ctx.pb
    .collection("serviceRecordAttachments")
    .getFullList<ServiceRecordAttachmentRecord>({
      filter: `serviceRecordId = "${serviceRecordId}"`,
      sort: "-uploadedAt",
    });
  return records.map(toView);
}

export async function deleteServiceRecordAttachment(
  ctx: Ctx,
  attachmentId: string,
  actor: { id: string; role: "admin" | "user" },
): Promise<void> {
  const attachment = await requireAttachment(ctx, attachmentId);
  const record = await requireServiceRecord(ctx, attachment.serviceRecordId);
  ensureMutationAccess(record, actor);
  await ctx.pb.collection("serviceRecordAttachments").delete(attachment.id);
}
