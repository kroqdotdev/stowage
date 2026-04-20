import { ClientResponseError } from "pocketbase";

import type { Ctx } from "@/server/pb/context";
import {
  IMAGE_MAX_LONG_EDGE,
  IMAGE_TARGET_BYTES,
  MAX_ATTACHMENT_UPLOAD_BYTES,
  normalizeOptimizationErrorMessage,
  replaceAttachmentExtension,
  type AttachmentKind,
} from "@/server/pb/attachments";

import {
  markAttachmentFailed,
  markAttachmentProcessing,
  markAttachmentReady,
} from "./attachments";

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
    options?: { quality?: number; compressionLevel?: number },
  ) => Promise<Buffer>;
};

type JimpFactory = { read: (data: Buffer | Uint8Array) => Promise<JimpImage> };

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

class NonRetryableError extends Error {
  readonly retryable = false as const;
}

function hasAlphaChannel(image: JimpImage) {
  const data = image.bitmap.data;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 255) return true;
  }
  return false;
}

async function optimizeImage(
  bytes: Uint8Array,
  fileName: string,
): Promise<OptimizedBinary> {
  const Jimp = await loadJimp();
  const image = await Jimp.read(Buffer.from(bytes));
  const longEdge = Math.max(image.bitmap.width, image.bitmap.height);
  if (longEdge > IMAGE_MAX_LONG_EDGE) {
    const scale = IMAGE_MAX_LONG_EDGE / longEdge;
    image.resize({
      w: Math.max(1, Math.round(image.bitmap.width * scale)),
      h: Math.max(1, Math.round(image.bitmap.height * scale)),
    });
  }

  if (hasAlphaChannel(image)) {
    let best: Uint8Array | null = null;
    for (const compressionLevel of PNG_COMPRESSION_STEPS) {
      const output = await image.getBuffer("image/png", { compressionLevel });
      if (!best || output.byteLength < best.byteLength) {
        best = new Uint8Array(output);
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
    if (!best) throw new Error("Image optimization produced no output");
    return {
      bytes: best,
      fileName: replaceAttachmentExtension(fileName, "png"),
      fileType: "image/png",
      fileExtension: "png",
    };
  }

  let best: Uint8Array | null = null;
  for (const quality of JPEG_QUALITY_STEPS) {
    const output = await image.getBuffer("image/jpeg", { quality });
    if (!best || output.byteLength < best.byteLength) {
      best = new Uint8Array(output);
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
  if (!best) throw new Error("Image optimization produced no output");
  return {
    bytes: best,
    fileName: replaceAttachmentExtension(fileName, "jpg"),
    fileType: "image/jpeg",
    fileExtension: "jpg",
  };
}

async function optimizePdf(
  bytes: Uint8Array,
  fileName: string,
): Promise<OptimizedBinary> {
  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.load(bytes, {
    updateMetadata: false,
    ignoreEncryption: true,
  });
  const optimized = await document.save({
    useObjectStreams: true,
    updateFieldAppearances: false,
    objectsPerTick: 50,
  });
  if (optimized.byteLength < bytes.byteLength) {
    return {
      bytes: new Uint8Array(optimized),
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

async function downloadAttachmentFile(
  ctx: Ctx,
  attachmentId: string,
  storageFile: string,
): Promise<Uint8Array> {
  const token = await ctx.pb.files.getToken();
  const url = ctx.pb.files.getURL(
    { id: attachmentId, collectionId: "attachments" } as unknown as {
      id: string;
      collectionId: string;
    },
    storageFile,
    { token },
  );
  const res = await fetch(url);
  if (!res.ok) {
    throw new NonRetryableError(
      `Failed to download attachment file (${res.status})`,
    );
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function processAttachmentOptimization(
  ctx: Ctx,
  attachmentId: string,
): Promise<void> {
  const start = await markAttachmentProcessing(ctx, attachmentId);
  if (start.state !== "started") return;

  const { record } = start;

  try {
    const source = record.originalFile || record.storageFile;
    if (!source) {
      throw new NonRetryableError("Uploaded file was not found");
    }

    if (record.fileSizeOriginal > MAX_ATTACHMENT_UPLOAD_BYTES) {
      throw new NonRetryableError(
        "This file is too large. Upload files up to 25 MB.",
      );
    }

    const inputBytes = await downloadAttachmentFile(ctx, record.id, source);

    const originalBinary: OptimizedBinary = {
      bytes: inputBytes,
      fileName: record.fileName,
      fileType: record.fileType,
      fileExtension: record.fileExtension,
    };

    let optimized: OptimizedBinary = originalBinary;
    const kind = record.fileKind as AttachmentKind;
    if (kind === "image") {
      optimized = await optimizeImage(inputBytes, record.fileName);
    } else if (kind === "pdf") {
      optimized = await optimizePdf(inputBytes, record.fileName);
    }

    const shouldReplace =
      optimized !== originalBinary &&
      (optimized.bytes.byteLength !== originalBinary.bytes.byteLength ||
        optimized.fileType !== originalBinary.fileType ||
        optimized.fileExtension !== originalBinary.fileExtension ||
        optimized.fileName !== originalBinary.fileName);

    await markAttachmentReady(ctx, {
      attachmentId: record.id,
      optimized: shouldReplace ? optimized : null,
      fileSizeOptimized: shouldReplace
        ? optimized.bytes.byteLength
        : originalBinary.bytes.byteLength,
    });
  } catch (error) {
    const retryable = !(error instanceof NonRetryableError);
    await markAttachmentFailed(ctx, {
      attachmentId,
      errorMessage: normalizeOptimizationErrorMessage(error),
      retryable,
    });
    // Retries are driven by a separate caller (e.g. the retry endpoint or a
    // scheduled worker). We deliberately do not block this call on a retry.
    if (
      !retryable &&
      error instanceof ClientResponseError &&
      error.status === 404
    ) {
      return;
    }
  }
}
