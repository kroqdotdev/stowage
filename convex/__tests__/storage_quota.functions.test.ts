import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const TINY_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAE0lEQVR4AWP8z8DwnwEImBigAAAfFwICgH3ifwAAAABJRU5ErkJggg==",
    "base64",
  ),
);

// A file large enough to exceed a tiny quota (~4 KB)
const LARGER_FILE = new Uint8Array(4096);

async function insertUser(
  t: ReturnType<typeof convexTest>,
): Promise<Id<"users">> {
  return (await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Admin",
      email: `admin-${Math.random().toString(36).slice(2)}@example.com`,
      role: "admin",
      createdBy: null,
      createdAt: Date.now(),
    }),
  )) as Id<"users">;
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function storeFile(
  t: ReturnType<typeof convexTest>,
  fileType: string,
  bytes: Uint8Array,
) {
  return (await t.run(async (ctx) =>
    ctx.storage.store(new Blob([Buffer.from(bytes)], { type: fileType })),
  )) as Id<"_storage">;
}

async function createAsset(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  name: string,
) {
  const admin = asUser(t, userId);
  const result = await admin.mutation(api.assets.createAsset, {
    name,
    categoryId: null,
    locationId: null,
    status: "active",
    notes: null,
    customFieldValues: {},
    tagIds: [],
  });
  return result.assetId;
}

async function createServiceRecord(
  t: ReturnType<typeof convexTest>,
  adminId: Id<"users">,
  assetId: Id<"assets">,
) {
  const now = Date.now();
  const groupId = (await t.run(async (ctx) =>
    ctx.db.insert("serviceGroups", {
      name: "Maintenance",
      normalizedName: "maintenance",
      description: null,
      createdAt: now,
      updatedAt: now,
      createdBy: adminId,
      updatedBy: adminId,
    }),
  )) as Id<"serviceGroups">;

  return (await t.run(async (ctx) =>
    ctx.db.insert("serviceRecords", {
      assetId,
      serviceGroupId: groupId,
      values: {},
      scheduleId: null,
      scheduledForDate: null,
      completedAt: now,
      completedBy: adminId,
      createdAt: now,
      updatedAt: now,
    }),
  )) as Id<"serviceRecords">;
}

describe("storage quota functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let assetId: Id<"assets">;
  let originalStorageLimitGb: string | undefined;

  beforeEach(async () => {
    vi.useFakeTimers();
    originalStorageLimitGb = process.env.STORAGE_LIMIT_GB;
    t = convexTest(schema, modules);
    adminId = await insertUser(t);
    assetId = await createAsset(t, adminId, "Quota test asset");
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalStorageLimitGb === undefined) {
      delete process.env.STORAGE_LIMIT_GB;
      return;
    }

    process.env.STORAGE_LIMIT_GB = originalStorageLimitGb;
  });

  describe("getStorageUsage query", () => {
    it("returns zero usage and null limit when no files exist and no limit set", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const usage = await admin.query(api.storage_quota.getStorageUsage, {});

      expect(usage.usedBytes).toBe(0);
      expect(usage.limitBytes).toBeNull();
    });

    it("returns the configured limit in bytes", async () => {
      process.env.STORAGE_LIMIT_GB = "15";
      const admin = asUser(t, adminId);
      const usage = await admin.query(api.storage_quota.getStorageUsage, {});

      expect(usage.limitBytes).toBe(15 * 1024 * 1024 * 1024);
    });

    it("counts asset attachment sizes", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const storageId = await storeFile(t, "image/png", TINY_PNG);

      await admin.mutation(api.attachments.createAttachment, {
        assetId,
        storageId,
        fileName: "photo.png",
        fileType: "image/png",
        fileSize: TINY_PNG.byteLength,
      });

      await t.finishAllScheduledFunctions(() => {
        vi.runAllTimers();
      });

      const usage = await admin.query(api.storage_quota.getStorageUsage, {});
      expect(usage.usedBytes).toBeGreaterThan(0);
    });

    it("counts service record attachment sizes", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const recordId = await createServiceRecord(t, adminId, assetId);
      const storageId = await storeFile(t, "application/pdf", TINY_PNG);

      await admin.mutation(api.serviceRecordAttachments.createAttachment, {
        serviceRecordId: recordId,
        storageId,
        fileName: "receipt.pdf",
        fileType: "application/pdf",
      });

      const usage = await admin.query(api.storage_quota.getStorageUsage, {});
      expect(usage.usedBytes).toBeGreaterThan(0);
    });

    it("excludes failed attachments from usage count", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const now = Date.now();
      const storageId = await storeFile(t, "image/png", TINY_PNG);

      await t.run(async (ctx) =>
        ctx.db.insert("attachments", {
          assetId,
          storageId,
          originalStorageId: null,
          fileName: "failed.png",
          fileType: "image/png",
          fileExtension: "png",
          fileKind: "image",
          fileSizeOriginal: 10_000_000,
          fileSizeOptimized: null,
          status: "failed",
          optimizationAttempts: 1,
          optimizationError: "Too large",
          uploadedBy: adminId,
          uploadedAt: now,
          updatedAt: now,
        }),
      );

      const usage = await admin.query(api.storage_quota.getStorageUsage, {});
      expect(usage.usedBytes).toBe(0);
    });

    it("uses optimized size when available", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const now = Date.now();
      const storageId = await storeFile(t, "image/png", TINY_PNG);

      await t.run(async (ctx) =>
        ctx.db.insert("attachments", {
          assetId,
          storageId,
          originalStorageId: null,
          fileName: "optimized.png",
          fileType: "image/png",
          fileExtension: "png",
          fileKind: "image",
          fileSizeOriginal: 5_000_000,
          fileSizeOptimized: 500_000,
          status: "ready",
          optimizationAttempts: 1,
          optimizationError: null,
          uploadedBy: adminId,
          uploadedAt: now,
          updatedAt: now,
        }),
      );

      const usage = await admin.query(api.storage_quota.getStorageUsage, {});
      expect(usage.usedBytes).toBe(500_000);
    });

    it("falls back to original size when not optimized yet", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const now = Date.now();
      const storageId = await storeFile(t, "image/png", TINY_PNG);

      await t.run(async (ctx) =>
        ctx.db.insert("attachments", {
          assetId,
          storageId,
          originalStorageId: storageId,
          fileName: "pending.png",
          fileType: "image/png",
          fileExtension: "png",
          fileKind: "image",
          fileSizeOriginal: 3_000_000,
          fileSizeOptimized: null,
          status: "pending",
          optimizationAttempts: 0,
          optimizationError: null,
          uploadedBy: adminId,
          uploadedAt: now,
          updatedAt: now,
        }),
      );

      const usage = await admin.query(api.storage_quota.getStorageUsage, {});
      expect(usage.usedBytes).toBe(3_000_000);
    });
  });

  describe("enforceStorageQuota on asset attachments", () => {
    it("allows uploads when no limit is set", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const storageId = await storeFile(t, "image/png", TINY_PNG);

      const result = await admin.mutation(api.attachments.createAttachment, {
        assetId,
        storageId,
        fileName: "no-limit.png",
        fileType: "image/png",
        fileSize: TINY_PNG.byteLength,
      });

      expect(result.attachmentId).toBeTruthy();
    });

    it("allows uploads within the quota", async () => {
      process.env.STORAGE_LIMIT_GB = "1";
      const admin = asUser(t, adminId);
      const storageId = await storeFile(t, "image/png", TINY_PNG);

      const result = await admin.mutation(api.attachments.createAttachment, {
        assetId,
        storageId,
        fileName: "within-quota.png",
        fileType: "image/png",
        fileSize: TINY_PNG.byteLength,
      });

      expect(result.attachmentId).toBeTruthy();
    });

    it("rejects uploads that would exceed the quota", async () => {
      // 0.000000001 GB ≈ 1 byte — any real file will exceed this
      process.env.STORAGE_LIMIT_GB = "0.000000001";
      const admin = asUser(t, adminId);
      const storageId = await storeFile(t, "image/png", LARGER_FILE);

      await expect(
        admin.mutation(api.attachments.createAttachment, {
          assetId,
          storageId,
          fileName: "over-quota.png",
          fileType: "image/png",
          fileSize: LARGER_FILE.byteLength,
        }),
      ).rejects.toThrow("Storage limit reached");
    });

    it("includes STORAGE_QUOTA_EXCEEDED in the error message", async () => {
      process.env.STORAGE_LIMIT_GB = "0.000000001";
      const admin = asUser(t, adminId);
      const storageId = await storeFile(t, "image/png", LARGER_FILE);

      try {
        await admin.mutation(api.attachments.createAttachment, {
          assetId,
          storageId,
          fileName: "over-quota.png",
          fileType: "image/png",
          fileSize: LARGER_FILE.byteLength,
        });
        expect.unreachable("Expected error");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        expect(message).toContain("STORAGE_QUOTA_EXCEEDED");
        expect(message).toContain("Storage limit reached");
      }
    });

    it("accounts for existing files when checking quota", async () => {
      const admin = asUser(t, adminId);

      // Upload a file with no limit
      delete process.env.STORAGE_LIMIT_GB;
      const storageId1 = await storeFile(t, "image/png", TINY_PNG);
      await admin.mutation(api.attachments.createAttachment, {
        assetId,
        storageId: storageId1,
        fileName: "first.png",
        fileType: "image/png",
        fileSize: TINY_PNG.byteLength,
      });

      await t.finishAllScheduledFunctions(() => {
        vi.runAllTimers();
      });

      // Set a limit just barely above current usage
      const usage = await admin.query(api.storage_quota.getStorageUsage, {});
      const limitGb = (usage.usedBytes + 1) / (1024 * 1024 * 1024);
      process.env.STORAGE_LIMIT_GB = limitGb.toString();

      // A second upload should exceed the limit
      const storageId2 = await storeFile(t, "image/png", TINY_PNG);
      await expect(
        admin.mutation(api.attachments.createAttachment, {
          assetId,
          storageId: storageId2,
          fileName: "second.png",
          fileType: "image/png",
          fileSize: TINY_PNG.byteLength,
        }),
      ).rejects.toThrow("Storage limit reached");
    });
  });

  describe("enforceStorageQuota on service record attachments", () => {
    let serviceRecordId: Id<"serviceRecords">;

    beforeEach(async () => {
      serviceRecordId = await createServiceRecord(t, adminId, assetId);
    });

    it("allows service record uploads when no limit is set", async () => {
      delete process.env.STORAGE_LIMIT_GB;
      const admin = asUser(t, adminId);
      const storageId = await storeFile(t, "application/pdf", TINY_PNG);

      const result = await admin.mutation(
        api.serviceRecordAttachments.createAttachment,
        {
          serviceRecordId,
          storageId,
          fileName: "receipt.pdf",
          fileType: "application/pdf",
        },
      );

      expect(result.attachmentId).toBeTruthy();
    });

    it("rejects service record uploads that would exceed the quota", async () => {
      process.env.STORAGE_LIMIT_GB = "0.000000001";
      const admin = asUser(t, adminId);
      const storageId = await storeFile(t, "application/pdf", LARGER_FILE);

      await expect(
        admin.mutation(api.serviceRecordAttachments.createAttachment, {
          serviceRecordId,
          storageId,
          fileName: "over-quota.pdf",
          fileType: "application/pdf",
        }),
      ).rejects.toThrow("Storage limit reached");
    });

    it("shares quota across asset and service record attachments", async () => {
      const admin = asUser(t, adminId);

      // Upload an asset attachment with no limit
      delete process.env.STORAGE_LIMIT_GB;
      const storageId1 = await storeFile(t, "image/png", TINY_PNG);
      await admin.mutation(api.attachments.createAttachment, {
        assetId,
        storageId: storageId1,
        fileName: "asset-file.png",
        fileType: "image/png",
        fileSize: TINY_PNG.byteLength,
      });

      await t.finishAllScheduledFunctions(() => {
        vi.runAllTimers();
      });

      // Set a limit just above current usage
      const usage = await admin.query(api.storage_quota.getStorageUsage, {});
      const limitGb = (usage.usedBytes + 1) / (1024 * 1024 * 1024);
      process.env.STORAGE_LIMIT_GB = limitGb.toString();

      // Service record upload should also be blocked by shared quota
      const storageId2 = await storeFile(t, "application/pdf", TINY_PNG);
      await expect(
        admin.mutation(api.serviceRecordAttachments.createAttachment, {
          serviceRecordId,
          storageId: storageId2,
          fileName: "receipt.pdf",
          fileType: "application/pdf",
        }),
      ).rejects.toThrow("Storage limit reached");
    });
  });
});
