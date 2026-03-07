"use node";

import { PDFDocument } from "pdf-lib";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import {
  IMAGE_MAX_LONG_EDGE,
  IMAGE_TARGET_BYTES,
  MAX_ATTACHMENT_UPLOAD_BYTES,
  getAttachmentRetryDelayMs,
  normalizeOptimizationErrorMessage,
  processAttachmentOptimizationRef,
  replaceAttachmentExtension,
} from "./attachments_helpers";

const JPEG_QUALITY_STEPS = [84, 76, 68, 60, 52, 44];
const PNG_COMPRESSION_STEPS = [9, 8, 7, 6];

type JimpImage = {
  bitmap: {
    width: number;
    height: number;
    data: Buffer | Uint8Array;
  };
  resize: (options: { w: number; h: number }) => JimpImage;
  getBuffer: (
    mime: "image/jpeg" | "image/png",
    options?: {
      quality?: number;
      compressionLevel?: number;
    },
  ) => Promise<Buffer>;
};

type JimpFactory = {
  read: (data: Buffer | Uint8Array) => Promise<JimpImage>;
};

let jimpPromise: Promise<JimpFactory> | null = null;

async function loadJimp() {
  if (!jimpPromise) {
    jimpPromise = import("jimp").then(
      (module) => ({ read: module.Jimp.read.bind(module.Jimp) }) as JimpFactory,
    );
  }

  return jimpPromise;
}

type OptimizedBinary = {
  bytes: Uint8Array;
  fileName: string;
  fileType: string;
  fileExtension: string;
};

function isNonRetryableOptimizationError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "retryable" in error &&
    (error as { retryable?: unknown }).retryable === false,
  );
}

function createNonRetryableOptimizationError(message: string) {
  const error = new Error(message) as Error & { retryable: false };
  error.retryable = false;
  return error;
}

function hasAlphaChannel(image: JimpImage) {
  const data = image.bitmap.data;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 255) {
      return true;
    }
  }
  return false;
}

async function optimizeImage(
  bytes: Uint8Array,
  fileName: string,
): Promise<OptimizedBinary> {
  const Jimp = await loadJimp();
  const image = await Jimp.read(Buffer.from(bytes));
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const longEdge = Math.max(width, height);
  if (longEdge > IMAGE_MAX_LONG_EDGE) {
    const scale = IMAGE_MAX_LONG_EDGE / longEdge;
    image.resize({
      w: Math.max(1, Math.round(width * scale)),
      h: Math.max(1, Math.round(height * scale)),
    });
  }

  if (hasAlphaChannel(image)) {
    let bestBytes: Uint8Array | null = null;
    for (const compressionLevel of PNG_COMPRESSION_STEPS) {
      const output = await image.getBuffer("image/png", { compressionLevel });
      if (!bestBytes || output.byteLength < bestBytes.byteLength) {
        bestBytes = new Uint8Array(output);
      }

      if (output.byteLength <= IMAGE_TARGET_BYTES) {
        return {
          bytes: new Uint8Array(output),
          fileName: replaceAttachmentExtension(fileName, "png"),
          fileType: "image/png",
          fileExtension: "png",
        };
      }
    }

    if (!bestBytes) {
      throw new Error("Image optimization produced no output");
    }

    return {
      bytes: bestBytes,
      fileName: replaceAttachmentExtension(fileName, "png"),
      fileType: "image/png",
      fileExtension: "png",
    };
  }

  let bestBytes: Uint8Array | null = null;

  for (const quality of JPEG_QUALITY_STEPS) {
    const output = await image.getBuffer("image/jpeg", {
      quality,
    });

    if (!bestBytes || output.byteLength < bestBytes.byteLength) {
      bestBytes = new Uint8Array(output);
    }

    if (output.byteLength <= IMAGE_TARGET_BYTES) {
      return {
        bytes: new Uint8Array(output),
        fileName: replaceAttachmentExtension(fileName, "jpg"),
        fileType: "image/jpeg",
        fileExtension: "jpg",
      };
    }
  }

  if (!bestBytes) {
    throw new Error("Image optimization produced no output");
  }

  return {
    bytes: bestBytes,
    fileName: replaceAttachmentExtension(fileName, "jpg"),
    fileType: "image/jpeg",
    fileExtension: "jpg",
  };
}

async function optimizePdf(
  bytes: Uint8Array,
  fileName: string,
): Promise<OptimizedBinary> {
  const document = await PDFDocument.load(bytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const optimizedBytes = await document.save({
    useObjectStreams: true,
    updateFieldAppearances: false,
    objectsPerTick: 50,
  });

  if (optimizedBytes.byteLength < bytes.byteLength) {
    return {
      bytes: new Uint8Array(optimizedBytes),
      fileName,
      fileType: "application/pdf",
      fileExtension: "pdf",
    };
  }

  return {
    bytes,
    fileName,
    fileType: "application/pdf",
    fileExtension: "pdf",
  };
}

export const processAttachmentOptimization = internalAction({
  args: {
    attachmentId: v.id("attachments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const processing = await ctx.runMutation(
      internal.attachments.markAttachmentProcessing,
      { attachmentId: args.attachmentId },
    );

    if (processing.state !== "started") {
      return null;
    }

    const attachment = await ctx.runQuery(
      internal.attachments.getAttachmentForProcessing,
      { attachmentId: args.attachmentId },
    );
    if (!attachment) {
      return null;
    }

    try {
      const blob = await ctx.storage.get(attachment.storageId);
      if (!blob) {
        throw new Error("Uploaded file was not found");
      }
      if (blob.size > MAX_ATTACHMENT_UPLOAD_BYTES) {
        try {
          await ctx.storage.delete(attachment.storageId);
        } catch {
          // Best effort cleanup when already deleted.
        }
        throw createNonRetryableOptimizationError(
          "This file is too large. Upload files up to 25 MB.",
        );
      }

      const inputBytes = new Uint8Array(await blob.arrayBuffer());
      const originalBinary: OptimizedBinary = {
        bytes: inputBytes,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileExtension: attachment.fileExtension,
      };
      let optimized: OptimizedBinary = originalBinary;

      if (attachment.fileKind === "image") {
        optimized = await optimizeImage(inputBytes, attachment.fileName);
      } else if (attachment.fileKind === "pdf") {
        optimized = await optimizePdf(inputBytes, attachment.fileName);
      }

      const outputBinary =
        optimized.bytes.byteLength < originalBinary.bytes.byteLength
          ? optimized
          : originalBinary;

      const shouldReplaceStoredFile =
        outputBinary !== originalBinary &&
        (outputBinary.bytes.byteLength !== originalBinary.bytes.byteLength ||
          outputBinary.fileType !== attachment.fileType ||
          outputBinary.fileExtension !== attachment.fileExtension ||
          outputBinary.fileName !== attachment.fileName);

      const newStorageId = shouldReplaceStoredFile
        ? await ctx.storage.store(
            new Blob([Buffer.from(outputBinary.bytes)], {
              type: outputBinary.fileType,
            }),
          )
        : null;

      await ctx.runMutation(internal.attachments.markAttachmentReady, {
        attachmentId: attachment._id,
        newStorageId,
        fileName: outputBinary.fileName,
        fileType: outputBinary.fileType,
        fileExtension: outputBinary.fileExtension,
        fileSizeOptimized: outputBinary.bytes.byteLength,
      });
    } catch (error) {
      const failure = await ctx.runMutation(
        internal.attachments.markAttachmentFailed,
        {
          attachmentId: args.attachmentId,
          errorMessage: normalizeOptimizationErrorMessage(error),
          retryable: !isNonRetryableOptimizationError(error),
        },
      );

      if (failure.shouldRetry) {
        await ctx.scheduler.runAfter(
          getAttachmentRetryDelayMs(failure.attempt),
          processAttachmentOptimizationRef,
          { attachmentId: args.attachmentId },
        );
      }
    }

    return null;
  },
});
