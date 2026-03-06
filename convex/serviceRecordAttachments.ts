import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAuthenticatedUser } from "./authz";
import {
  ATTACHMENT_KINDS,
  MAX_ATTACHMENT_UPLOAD_BYTES,
  classifyAttachment,
  sanitizeAttachmentFileName,
} from "./attachments_helpers";
import { throwServiceRecordError } from "./service_record_helpers";

const serviceRecordAttachmentKindValidator = v.union(
  ...ATTACHMENT_KINDS.map((kind) => v.literal(kind)),
);

const serviceRecordAttachmentValidator = v.object({
  _id: v.id("serviceRecordAttachments"),
  _creationTime: v.number(),
  serviceRecordId: v.id("serviceRecords"),
  fileName: v.string(),
  fileType: v.string(),
  fileExtension: v.string(),
  fileKind: serviceRecordAttachmentKindValidator,
  fileSize: v.number(),
  uploadedBy: v.id("users"),
  uploadedAt: v.number(),
  updatedAt: v.number(),
  url: v.union(v.string(), v.null()),
});

type ServiceRecordAttachmentRow = {
  _id: Id<"serviceRecordAttachments">;
  _creationTime: number;
  serviceRecordId: Id<"serviceRecords">;
  storageId: Id<"_storage">;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: "image" | "pdf" | "office";
  fileSize: number;
  uploadedBy: Id<"users">;
  uploadedAt: number;
  updatedAt: number;
};

async function requireServiceRecord(
  ctx: QueryCtx | MutationCtx,
  serviceRecordId: Id<"serviceRecords">,
) {
  const record = await ctx.db.get(serviceRecordId);
  if (!record) {
    throwServiceRecordError("RECORD_NOT_FOUND", "Service record not found");
  }
}

async function requireServiceRecordAttachment(
  ctx: QueryCtx | MutationCtx,
  attachmentId: Id<"serviceRecordAttachments">,
) {
  const attachment = (await ctx.db.get(
    attachmentId,
  )) as ServiceRecordAttachmentRow | null;
  if (!attachment) {
    throwServiceRecordError(
      "ATTACHMENT_NOT_FOUND",
      "Service record attachment not found",
    );
  }
  await requireServiceRecord(ctx, attachment.serviceRecordId);
  return attachment;
}

export const generateUploadUrl = mutation({
  args: {},
  returns: v.object({ uploadUrl: v.string() }),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl };
  },
});

export const createAttachment = mutation({
  args: {
    serviceRecordId: v.id("serviceRecords"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({ attachmentId: v.id("serviceRecordAttachments") }),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    await requireServiceRecord(ctx, args.serviceRecordId);

    const uploadedMetadata = await ctx.db.system.get("_storage", args.storageId);
    if (!uploadedMetadata) {
      throwServiceRecordError(
        "ATTACHMENT_NOT_FOUND",
        "Uploaded file was not found",
      );
    }

    const fileSize = uploadedMetadata.size;
    if (fileSize > MAX_ATTACHMENT_UPLOAD_BYTES) {
      try {
        await ctx.storage.delete(args.storageId);
      } catch {
        // no-op best effort cleanup
      }
      throwServiceRecordError(
        "INVALID_FIELD_VALUE",
        "This file is too large. Upload files up to 25 MB.",
      );
    }

    const fileName = sanitizeAttachmentFileName(args.fileName);
    const fileType =
      args.fileType || uploadedMetadata.contentType || "application/octet-stream";
    const classification = classifyAttachment(fileName, fileType);
    const now = Date.now();

    const attachmentId = await ctx.db.insert("serviceRecordAttachments", {
      serviceRecordId: args.serviceRecordId,
      storageId: args.storageId,
      fileName,
      fileType: classification.mimeType,
      fileExtension: classification.extension,
      fileKind: classification.kind,
      fileSize,
      uploadedBy: actor._id as Id<"users">,
      uploadedAt: now,
      updatedAt: now,
    });

    return { attachmentId };
  },
});

export const listAttachments = query({
  args: {
    serviceRecordId: v.id("serviceRecords"),
  },
  returns: v.array(serviceRecordAttachmentValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireServiceRecord(ctx, args.serviceRecordId);

    const rows = (await ctx.db
      .query("serviceRecordAttachments")
      .withIndex("by_serviceRecordId_and_uploadedAt", (q) =>
        q.eq("serviceRecordId", args.serviceRecordId),
      )
      .order("desc")
      .collect()) as ServiceRecordAttachmentRow[];

    const urls = await Promise.all(
      rows.map((row) => ctx.storage.getUrl(row.storageId)),
    );

    return rows.map((row, index) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      serviceRecordId: row.serviceRecordId,
      fileName: row.fileName,
      fileType: row.fileType,
      fileExtension: row.fileExtension,
      fileKind: row.fileKind,
      fileSize: row.fileSize,
      uploadedBy: row.uploadedBy,
      uploadedAt: row.uploadedAt,
      updatedAt: row.updatedAt,
      url: urls[index] ?? null,
    }));
  },
});

export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("serviceRecordAttachments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const attachment = await requireServiceRecordAttachment(ctx, args.attachmentId);
    await ctx.db.delete(attachment._id);

    try {
      await ctx.storage.delete(attachment.storageId);
    } catch {
      // file may already be removed
    }

    return null;
  },
});
