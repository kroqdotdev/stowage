import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAssetExists } from "./assets_helpers";
import { requireAuthenticatedUser } from "./authz";
import {
  ATTACHMENT_KINDS,
  ATTACHMENT_STATUSES,
  MAX_ATTACHMENT_RETRY_ATTEMPTS,
  MAX_ATTACHMENT_UPLOAD_BYTES,
  classifyAttachment,
  processAttachmentOptimizationRef,
  sanitizeAttachmentFileName,
  throwAttachmentError,
} from "./attachments_helpers";
import { enforceStorageQuota } from "./storage_quota";

const attachmentStatusValidator = v.union(
  ...ATTACHMENT_STATUSES.map((status) => v.literal(status)),
);

const attachmentKindValidator = v.union(
  ...ATTACHMENT_KINDS.map((kind) => v.literal(kind)),
);

const attachmentViewValidator = v.object({
  _id: v.id("attachments"),
  _creationTime: v.number(),
  assetId: v.id("assets"),
  fileName: v.string(),
  fileType: v.string(),
  fileExtension: v.string(),
  fileKind: attachmentKindValidator,
  fileSizeOriginal: v.number(),
  fileSizeOptimized: v.union(v.number(), v.null()),
  status: attachmentStatusValidator,
  optimizationAttempts: v.number(),
  optimizationError: v.union(v.string(), v.null()),
  uploadedBy: v.id("users"),
  uploadedAt: v.number(),
  updatedAt: v.number(),
  url: v.union(v.string(), v.null()),
});

const processingStateValidator = v.union(
  v.literal("started"),
  v.literal("missing"),
  v.literal("skip"),
);

const processingAttachmentValidator = v.object({
  _id: v.id("attachments"),
  assetId: v.id("assets"),
  storageId: v.id("_storage"),
  originalStorageId: v.union(v.id("_storage"), v.null()),
  fileName: v.string(),
  fileType: v.string(),
  fileExtension: v.string(),
  fileKind: attachmentKindValidator,
  fileSizeOriginal: v.number(),
  fileSizeOptimized: v.union(v.number(), v.null()),
  status: attachmentStatusValidator,
  optimizationAttempts: v.number(),
});

type AttachmentRow = {
  _id: Id<"attachments">;
  _creationTime: number;
  assetId: Id<"assets">;
  storageId: Id<"_storage">;
  originalStorageId: Id<"_storage"> | null;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: (typeof ATTACHMENT_KINDS)[number];
  fileSizeOriginal: number;
  fileSizeOptimized: number | null;
  status: (typeof ATTACHMENT_STATUSES)[number];
  optimizationAttempts: number;
  optimizationError: string | null;
  uploadedBy: Id<"users">;
  uploadedAt: number;
  updatedAt: number;
};

async function requireAttachment(
  ctx: QueryCtx | MutationCtx,
  attachmentId: Id<"attachments">,
) {
  const attachment = (await ctx.db.get(attachmentId)) as AttachmentRow | null;
  if (!attachment) {
    throwAttachmentError("ATTACHMENT_NOT_FOUND", "Attachment not found");
  }

  return attachment;
}

async function deleteStorageIds(
  ctx: MutationCtx,
  storageIds: Array<Id<"_storage"> | null>,
) {
  const uniqueIds = Array.from(
    new Set(
      storageIds.filter(
        (storageId): storageId is Id<"_storage"> => storageId !== null,
      ),
    ),
  );

  await Promise.all(
    uniqueIds.map(async (storageId) => {
      try {
        await ctx.storage.delete(storageId);
      } catch {
        // Best-effort cleanup when files were already removed.
      }
    }),
  );
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

// Access control: All authenticated users can upload attachments to any asset.
// Stowage is a collaborative tool where team members freely manage asset files.
export const createAttachment = mutation({
  args: {
    assetId: v.id("assets"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.optional(v.union(v.string(), v.null())),
    fileSize: v.optional(v.number()),
  },
  returns: v.object({ attachmentId: v.id("attachments") }),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    await requireAssetExists(ctx, args.assetId);

    const uploadedMetadata = await ctx.db.system.get(
      "_storage",
      args.storageId,
    );
    if (!uploadedMetadata) {
      throwAttachmentError("UPLOAD_NOT_FOUND", "Uploaded file was not found");
    }

    const fileName = sanitizeAttachmentFileName(args.fileName);
    const fileType =
      args.fileType ||
      uploadedMetadata.contentType ||
      "application/octet-stream";
    const now = Date.now();
    const classification = classifyAttachment(fileName, fileType);
    const fileSize = uploadedMetadata.size;

    await enforceStorageQuota(ctx, fileSize);

    if (fileSize > MAX_ATTACHMENT_UPLOAD_BYTES) {
      const errorMessage = "This file is too large. Upload files up to 25 MB.";
      await deleteStorageIds(ctx, [args.storageId]);

      const attachmentId = await ctx.db.insert("attachments", {
        assetId: args.assetId,
        storageId: args.storageId,
        originalStorageId: null,
        fileName,
        fileType: classification.mimeType,
        fileExtension: classification.extension,
        fileKind: classification.kind,
        fileSizeOriginal: fileSize,
        fileSizeOptimized: null,
        status: "failed",
        optimizationAttempts: 0,
        optimizationError: errorMessage,
        uploadedBy: actor._id as Id<"users">,
        uploadedAt: now,
        updatedAt: now,
      });

      return { attachmentId };
    }

    const attachmentId = await ctx.db.insert("attachments", {
      assetId: args.assetId,
      storageId: args.storageId,
      originalStorageId: args.storageId,
      fileName,
      fileType: classification.mimeType,
      fileExtension: classification.extension,
      fileKind: classification.kind,
      fileSizeOriginal: fileSize,
      fileSizeOptimized: null,
      status: "pending",
      optimizationAttempts: 0,
      optimizationError: null,
      uploadedBy: actor._id as Id<"users">,
      uploadedAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, processAttachmentOptimizationRef, {
      attachmentId,
    });

    return { attachmentId };
  },
});

export const listAttachments = query({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.array(attachmentViewValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireAssetExists(ctx, args.assetId);

    const rows = (await ctx.db
      .query("attachments")
      .withIndex("by_assetId_and_uploadedAt", (q) =>
        q.eq("assetId", args.assetId),
      )
      .order("desc")
      .collect()) as AttachmentRow[];

    const urls = await Promise.all(
      rows.map((row) => ctx.storage.getUrl(row.storageId)),
    );

    return rows.map((row, index) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      assetId: row.assetId,
      fileName: row.fileName,
      fileType: row.fileType,
      fileExtension: row.fileExtension,
      fileKind: row.fileKind,
      fileSizeOriginal: row.fileSizeOriginal,
      fileSizeOptimized: row.fileSizeOptimized,
      status: row.status,
      optimizationAttempts: row.optimizationAttempts,
      optimizationError: row.optimizationError,
      uploadedBy: row.uploadedBy,
      uploadedAt: row.uploadedAt,
      updatedAt: row.updatedAt,
      url: urls[index] ?? null,
    }));
  },
});

const attachmentQueueStatusValidator = v.object({
  _id: v.id("attachments"),
  status: attachmentStatusValidator,
  optimizationError: v.union(v.string(), v.null()),
});

export const listAttachmentQueueStatuses = query({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.array(attachmentQueueStatusValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireAssetExists(ctx, args.assetId);

    const rows = (await ctx.db
      .query("attachments")
      .withIndex("by_assetId_and_uploadedAt", (q) =>
        q.eq("assetId", args.assetId),
      )
      .order("desc")
      .collect()) as AttachmentRow[];

    return rows.map((row) => ({
      _id: row._id,
      status: row.status,
      optimizationError: row.optimizationError,
    }));
  },
});

export const getAttachmentUrl = query({
  args: {
    attachmentId: v.id("attachments"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const attachment = await requireAttachment(ctx, args.attachmentId);
    await requireAssetExists(ctx, attachment.assetId);

    return ctx.storage.getUrl(attachment.storageId);
  },
});

// Access control: All authenticated users can delete any attachment.
// This is intentional for a collaborative asset management workflow.
export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const attachment = await requireAttachment(ctx, args.attachmentId);
    await requireAssetExists(ctx, attachment.assetId);

    await ctx.db.delete(attachment._id);
    await deleteStorageIds(ctx, [
      attachment.storageId,
      attachment.originalStorageId,
    ]);

    return null;
  },
});

export const retryAttachmentOptimization = mutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const attachment = await requireAttachment(ctx, args.attachmentId);
    await requireAssetExists(ctx, attachment.assetId);

    if (attachment.status !== "failed" && attachment.status !== "pending") {
      throwAttachmentError(
        "RETRY_NOT_ALLOWED",
        "This attachment is not in a retryable state.",
      );
    }

    await ctx.db.patch(attachment._id, {
      status: "pending",
      optimizationError: null,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, processAttachmentOptimizationRef, {
      attachmentId: attachment._id,
    });

    return null;
  },
});

export const getAttachmentForProcessing = internalQuery({
  args: {
    attachmentId: v.id("attachments"),
  },
  returns: v.union(processingAttachmentValidator, v.null()),
  handler: async (ctx, args) => {
    const attachment = (await ctx.db.get(
      args.attachmentId,
    )) as AttachmentRow | null;
    if (!attachment) {
      return null;
    }

    return {
      _id: attachment._id,
      assetId: attachment.assetId,
      storageId: attachment.storageId,
      originalStorageId: attachment.originalStorageId,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileExtension: attachment.fileExtension,
      fileKind: attachment.fileKind,
      fileSizeOriginal: attachment.fileSizeOriginal,
      fileSizeOptimized: attachment.fileSizeOptimized,
      status: attachment.status,
      optimizationAttempts: attachment.optimizationAttempts,
    };
  },
});

export const markAttachmentProcessing = internalMutation({
  args: {
    attachmentId: v.id("attachments"),
  },
  returns: v.object({
    state: processingStateValidator,
    attempt: v.number(),
  }),
  handler: async (ctx, args) => {
    const attachment = (await ctx.db.get(
      args.attachmentId,
    )) as AttachmentRow | null;
    if (!attachment) {
      return { state: "missing" as const, attempt: 0 };
    }

    if (attachment.status === "ready" || attachment.status === "processing") {
      return {
        state: "skip" as const,
        attempt: attachment.optimizationAttempts,
      };
    }

    const nextAttempt = attachment.optimizationAttempts + 1;
    await ctx.db.patch(attachment._id, {
      status: "processing",
      optimizationAttempts: nextAttempt,
      optimizationError: null,
      updatedAt: Date.now(),
    });

    return { state: "started" as const, attempt: nextAttempt };
  },
});

export const markAttachmentReady = internalMutation({
  args: {
    attachmentId: v.id("attachments"),
    newStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    fileName: v.string(),
    fileType: v.string(),
    fileExtension: v.string(),
    fileSizeOptimized: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = (await ctx.db.get(
      args.attachmentId,
    )) as AttachmentRow | null;
    if (!attachment) {
      return null;
    }

    const nextStorageId = args.newStorageId ?? attachment.storageId;

    await ctx.db.patch(attachment._id, {
      storageId: nextStorageId,
      originalStorageId: null,
      fileName: args.fileName,
      fileType: args.fileType,
      fileExtension: args.fileExtension,
      fileSizeOptimized: args.fileSizeOptimized,
      status: "ready",
      optimizationError: null,
      updatedAt: Date.now(),
    });

    const cleanupIds: Array<Id<"_storage"> | null> = [];
    if (args.newStorageId && args.newStorageId !== attachment.storageId) {
      cleanupIds.push(attachment.storageId);
    }

    if (
      attachment.originalStorageId &&
      attachment.originalStorageId !== nextStorageId &&
      attachment.originalStorageId !== attachment.storageId
    ) {
      cleanupIds.push(attachment.originalStorageId);
    }

    if (cleanupIds.length > 0) {
      await deleteStorageIds(ctx, cleanupIds);
    }

    return null;
  },
});

export const markAttachmentFailed = internalMutation({
  args: {
    attachmentId: v.id("attachments"),
    errorMessage: v.string(),
    retryable: v.optional(v.boolean()),
  },
  returns: v.object({
    attempt: v.number(),
    shouldRetry: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const attachment = (await ctx.db.get(
      args.attachmentId,
    )) as AttachmentRow | null;
    if (!attachment) {
      return { attempt: 0, shouldRetry: false };
    }

    await ctx.db.patch(attachment._id, {
      status: "failed",
      optimizationError: args.errorMessage,
      updatedAt: Date.now(),
    });

    const retryable = args.retryable ?? true;

    return {
      attempt: attachment.optimizationAttempts,
      shouldRetry:
        retryable &&
        attachment.optimizationAttempts < MAX_ATTACHMENT_RETRY_ATTEMPTS,
    };
  },
});
