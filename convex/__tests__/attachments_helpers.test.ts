import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import {
  sanitizeAttachmentFileName,
  getAttachmentExtension,
  classifyAttachment,
  replaceAttachmentExtension,
  getAttachmentRetryDelayMs,
  normalizeOptimizationErrorMessage,
} from "../attachments_helpers";

function expectConvexError(fn: () => unknown, code: string) {
  try {
    fn();
    expect.unreachable("Expected ConvexError");
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code);
  }
}

describe("sanitizeAttachmentFileName", () => {
  it("trims whitespace", () => {
    expect(sanitizeAttachmentFileName("  photo.jpg  ")).toBe("photo.jpg");
  });

  it("strips path components", () => {
    expect(sanitizeAttachmentFileName("C:\\Users\\docs\\photo.jpg")).toBe(
      "photo.jpg",
    );
    expect(sanitizeAttachmentFileName("/home/user/photo.jpg")).toBe(
      "photo.jpg",
    );
  });

  it("collapses internal whitespace", () => {
    expect(sanitizeAttachmentFileName("my   photo.jpg")).toBe("my photo.jpg");
  });

  it("throws on empty file name", () => {
    expectConvexError(
      () => sanitizeAttachmentFileName(""),
      "INVALID_FILE_NAME",
    );
    expectConvexError(
      () => sanitizeAttachmentFileName("   "),
      "INVALID_FILE_NAME",
    );
  });
});

describe("getAttachmentExtension", () => {
  it("returns lowercase extension", () => {
    expect(getAttachmentExtension("photo.JPG")).toBe("jpg");
  });

  it("returns last extension for double extensions", () => {
    expect(getAttachmentExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns null for no extension", () => {
    expect(getAttachmentExtension("README")).toBeNull();
  });

  it("returns null for trailing dot", () => {
    expect(getAttachmentExtension("file.")).toBeNull();
  });
});

describe("classifyAttachment", () => {
  it("classifies image files", () => {
    const result = classifyAttachment("photo.jpg", "image/jpeg");
    expect(result.kind).toBe("image");
    expect(result.extension).toBe("jpg");
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("classifies image files with no mime type", () => {
    const result = classifyAttachment("photo.png", null);
    expect(result.kind).toBe("image");
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("classifies PDF files", () => {
    const result = classifyAttachment("document.pdf", "application/pdf");
    expect(result.kind).toBe("pdf");
    expect(result.mimeType).toBe("application/pdf");
  });

  it("classifies Office files", () => {
    const result = classifyAttachment("report.docx", null);
    expect(result.kind).toBe("office");
    expect(result.extension).toBe("docx");
  });

  it("rejects unsupported extensions", () => {
    expectConvexError(
      () => classifyAttachment("file.exe", "application/octet-stream"),
      "INVALID_FILE_TYPE",
    );
  });

  it("rejects files with no extension", () => {
    expectConvexError(
      () => classifyAttachment("README", "text/plain"),
      "INVALID_FILE_TYPE",
    );
  });

  it("rejects image extension with wrong mime type", () => {
    expectConvexError(
      () => classifyAttachment("photo.jpg", "application/pdf"),
      "INVALID_FILE_TYPE",
    );
  });

  it("rejects pdf extension with wrong mime type", () => {
    expectConvexError(
      () => classifyAttachment("doc.pdf", "image/jpeg"),
      "INVALID_FILE_TYPE",
    );
  });
});

describe("replaceAttachmentExtension", () => {
  it("replaces existing extension", () => {
    expect(replaceAttachmentExtension("photo.jpg", "webp")).toBe("photo.webp");
  });

  it("appends extension when none exists", () => {
    expect(replaceAttachmentExtension("README", "txt")).toBe("README.txt");
  });
});

describe("getAttachmentRetryDelayMs", () => {
  it("returns 5s for first attempt", () => {
    expect(getAttachmentRetryDelayMs(1)).toBe(5_000);
  });

  it("returns 20s for second attempt", () => {
    expect(getAttachmentRetryDelayMs(2)).toBe(20_000);
  });

  it("returns 60s for third and beyond", () => {
    expect(getAttachmentRetryDelayMs(3)).toBe(60_000);
    expect(getAttachmentRetryDelayMs(5)).toBe(60_000);
  });
});

describe("normalizeOptimizationErrorMessage", () => {
  it("extracts error message from Error instances", () => {
    expect(normalizeOptimizationErrorMessage(new Error("Sharp failed"))).toBe(
      "Sharp failed",
    );
  });

  it("truncates long error messages", () => {
    const longMessage = "x".repeat(300);
    const result = normalizeOptimizationErrorMessage(new Error(longMessage));
    expect(result.length).toBe(240);
  });

  it("returns default message for non-Error values", () => {
    expect(normalizeOptimizationErrorMessage("string error")).toBe(
      "Attachment optimization failed",
    );
    expect(normalizeOptimizationErrorMessage(null)).toBe(
      "Attachment optimization failed",
    );
  });
});
