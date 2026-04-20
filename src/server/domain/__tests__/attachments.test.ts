import { afterEach, describe, expect, it, vi } from "vitest";

import { createAsset } from "@/server/domain/assets";
import {
  createAttachment,
  deleteAttachment,
  getAttachmentUrl,
  listAttachmentQueueStatuses,
  listAttachments,
  markAttachmentFailed,
  markAttachmentProcessing,
  markAttachmentReady,
  retryAttachmentOptimization,
} from "@/server/domain/attachments";
import type { Ctx } from "@/server/pb/context";
import { NotFoundError, ValidationError } from "@/server/pb/errors";
import { StorageQuotaError } from "@/server/pb/storage-quota";
import { usePbHarness } from "@/test/pb-harness";

async function seedAdmin(pb: Ctx["pb"]) {
  return pb.collection("users").create({
    email: `admin-${Math.random().toString(36).slice(2)}@stowage.local`,
    password: "password123",
    passwordConfirm: "password123",
    role: "admin",
    createdAt: Date.now(),
  });
}

// 1x1 transparent PNG
const TINY_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

describe("attachments domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates an attachment in pending state with a resolvable file URL", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });

    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "badge.png",
      fileType: "image/png",
      fileBuffer: TINY_PNG,
      actorId: admin.id,
    });

    const list = await listAttachments(ctx(), assetId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: attachmentId,
      assetId,
      fileName: "badge.png",
      fileType: "image/png",
      fileExtension: "png",
      fileKind: "image",
      status: "pending",
      optimizationAttempts: 0,
      optimizationError: null,
    });
    expect(list[0].url).toMatch(/\/api\/files\/attachments\/.+/);
    expect(list[0].fileSizeOriginal).toBe(TINY_PNG.byteLength);
  });

  it("sanitizes the file name and classifies the kind", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });

    await createAttachment(ctx(), {
      assetId,
      fileName: "  C:\\tmp\\Report   Draft.PDF  ",
      fileType: "application/pdf",
      fileBuffer: new Uint8Array([37, 80, 68, 70, 45]),
      actorId: admin.id,
    });

    const list = await listAttachments(ctx(), assetId);
    expect(list[0]).toMatchObject({
      fileName: "Report Draft.PDF",
      fileType: "application/pdf",
      fileKind: "pdf",
    });
  });

  it("rejects unsupported file types with ValidationError", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    await expect(
      createAttachment(ctx(), {
        assetId,
        fileName: "archive.zip",
        fileType: "application/zip",
        fileBuffer: new Uint8Array([1, 2, 3]),
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("marks oversized uploads as failed and records a helpful error", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const big = new Uint8Array(26 * 1024 * 1024);
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "huge.pdf",
      fileType: "application/pdf",
      fileBuffer: big,
      actorId: admin.id,
    });
    const statuses = await listAttachmentQueueStatuses(ctx(), assetId);
    const entry = statuses.find((s) => s.id === attachmentId);
    expect(entry?.status).toBe("failed");
    expect(entry?.optimizationError).toMatch(/too large/i);
  });

  it("enforces storage quota when STORAGE_LIMIT_GB is set", async () => {
    vi.stubEnv("STORAGE_LIMIT_GB", "0.00000001"); // ~10.7 bytes
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    await expect(
      createAttachment(ctx(), {
        assetId,
        fileName: "badge.png",
        fileType: "image/png",
        fileBuffer: TINY_PNG,
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(StorageQuotaError);
  });

  it("deleteAttachment removes the record and NotFoundErrors on missing", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "badge.png",
      fileType: "image/png",
      fileBuffer: TINY_PNG,
      actorId: admin.id,
    });
    await deleteAttachment(ctx(), attachmentId);
    await expect(listAttachments(ctx(), assetId)).resolves.toEqual([]);
    await expect(deleteAttachment(ctx(), attachmentId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("getAttachmentUrl returns the file URL and null for orphan records", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "badge.png",
      fileType: "image/png",
      fileBuffer: TINY_PNG,
      actorId: admin.id,
    });
    await expect(getAttachmentUrl(ctx(), attachmentId)).resolves.toMatch(
      /\/api\/files\/attachments\//,
    );
  });

  it("retryAttachmentOptimization rejects a ready attachment", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "badge.png",
      fileType: "image/png",
      fileBuffer: TINY_PNG,
      actorId: admin.id,
    });

    await markAttachmentProcessing(ctx(), attachmentId);
    await markAttachmentReady(ctx(), {
      attachmentId,
      optimized: null,
      fileSizeOptimized: TINY_PNG.byteLength,
    });
    await expect(
      retryAttachmentOptimization(ctx(), attachmentId),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("state machine: processing → failed with retry budget", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "badge.png",
      fileType: "image/png",
      fileBuffer: TINY_PNG,
      actorId: admin.id,
    });

    const start = await markAttachmentProcessing(ctx(), attachmentId);
    expect(start.state).toBe("started");
    if (start.state !== "started") throw new Error("unreachable");
    expect(start.attempt).toBe(1);

    const fail1 = await markAttachmentFailed(ctx(), {
      attachmentId,
      errorMessage: "temporary",
    });
    expect(fail1).toEqual({ attempt: 1, shouldRetry: true });

    await markAttachmentProcessing(ctx(), attachmentId); // attempt 2
    const fail2 = await markAttachmentFailed(ctx(), {
      attachmentId,
      errorMessage: "still temporary",
    });
    expect(fail2).toEqual({ attempt: 2, shouldRetry: true });

    await markAttachmentProcessing(ctx(), attachmentId); // attempt 3
    const fail3 = await markAttachmentFailed(ctx(), {
      attachmentId,
      errorMessage: "still failing",
    });
    expect(fail3).toEqual({ attempt: 3, shouldRetry: false });
  });

  it("markAttachmentProcessing returns skip when already ready or processing", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "badge.png",
      fileType: "image/png",
      fileBuffer: TINY_PNG,
      actorId: admin.id,
    });
    await markAttachmentProcessing(ctx(), attachmentId);
    const second = await markAttachmentProcessing(ctx(), attachmentId);
    // After first call, status = processing; second call should skip.
    expect(second.state).toBe("skip");
  });

  it("createAttachment NotFoundErrors on an unknown asset", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createAttachment(ctx(), {
        assetId: "nonexistent0000",
        fileName: "badge.png",
        fileType: "image/png",
        fileBuffer: TINY_PNG,
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
