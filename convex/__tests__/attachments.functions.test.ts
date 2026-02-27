import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { convexTest } from "convex-test"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"

const modules = import.meta.glob("../**/*.ts")

const TINY_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAE0lEQVR4AWP8z8DwnwEImBigAAAfFwICgH3ifwAAAABJRU5ErkJggg==",
    "base64",
  ),
)

const SIMPLE_PDF = Uint8Array.from(
  Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 120 Td (Hello PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n295\n%%EOF",
    "utf8",
  ),
)

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
  )) as Id<"users">
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId })
}

async function storeFile(
  t: ReturnType<typeof convexTest>,
  fileType: string,
  bytes: Uint8Array,
) {
  return (await t.run(async (ctx) =>
    ctx.storage.store(new Blob([Buffer.from(bytes)], { type: fileType })),
  )) as Id<"_storage">
}

describe("attachments functions", () => {
  let t: ReturnType<typeof convexTest>
  let adminId: Id<"users">
  let assetId: Id<"assets">

  beforeEach(async () => {
    vi.useFakeTimers()
    t = convexTest(schema, modules)
    adminId = await insertUser(t)

    const admin = asUser(t, adminId)
    const created = await admin.mutation(api.assets.createAsset, {
      name: "Asset with files",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    })
    assetId = created.assetId
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("generates upload URLs for authenticated users", async () => {
    const admin = asUser(t, adminId)
    const result = await admin.mutation(api.attachments.generateUploadUrl, {})

    expect(result.uploadUrl).toContain("http")
  })

  it("creates and optimizes image attachments asynchronously", async () => {
    const admin = asUser(t, adminId)
    const storageId = await storeFile(t, "image/png", TINY_PNG)

    await admin.mutation(api.attachments.createAttachment, {
      assetId,
      storageId,
      fileName: "photo.png",
      fileType: "image/png",
      fileSize: TINY_PNG.byteLength,
    })

    await t.finishAllScheduledFunctions(() => {
      vi.runAllTimers()
    })

    const list = await admin.query(api.attachments.listAttachments, { assetId })
    expect(list).toHaveLength(1)
    expect(list[0]?.status).toBe("ready")
    expect(list[0]?.fileKind).toBe("image")
    expect(list[0]?.fileType).toBe("image/jpeg")
    expect(list[0]?.fileExtension).toBe("jpg")
    expect(list[0]?.url).toBeTypeOf("string")
  })

  it("processes pdf attachments and keeps them available", async () => {
    const admin = asUser(t, adminId)
    const storageId = await storeFile(t, "application/pdf", SIMPLE_PDF)

    await admin.mutation(api.attachments.createAttachment, {
      assetId,
      storageId,
      fileName: "manual.pdf",
      fileType: "application/pdf",
      fileSize: SIMPLE_PDF.byteLength,
    })

    await t.finishAllScheduledFunctions(() => {
      vi.runAllTimers()
    })

    const list = await admin.query(api.attachments.listAttachments, { assetId })
    expect(list).toHaveLength(1)
    expect(list[0]?.status).toBe("ready")
    expect(list[0]?.fileKind).toBe("pdf")
    expect(list[0]?.url).toBeTypeOf("string")
  })

  it("rejects unsupported file types", async () => {
    const admin = asUser(t, adminId)
    const storageId = await storeFile(
      t,
      "text/plain",
      Uint8Array.from(Buffer.from("plain text", "utf8")),
    )

    await expect(
      admin.mutation(api.attachments.createAttachment, {
        assetId,
        storageId,
        fileName: "notes.txt",
        fileType: "text/plain",
        fileSize: 10,
      }),
    ).rejects.toThrow("Unsupported file type")
  })

  it("deletes attachments and storage files", async () => {
    const admin = asUser(t, adminId)
    const storageId = await storeFile(
      t,
      "application/vnd.ms-excel",
      Uint8Array.from(Buffer.from("legacy sheet", "utf8")),
    )

    await admin.mutation(api.attachments.createAttachment, {
      assetId,
      storageId,
      fileName: "legacy.xls",
      fileType: "application/vnd.ms-excel",
      fileSize: 12,
    })

    await t.finishAllScheduledFunctions(() => {
      vi.runAllTimers()
    })

    const list = await admin.query(api.attachments.listAttachments, { assetId })
    const attachmentId = list[0]?._id
    expect(attachmentId).toBeTruthy()

    await admin.mutation(api.attachments.deleteAttachment, {
      attachmentId: attachmentId as Id<"attachments">,
    })

    const afterDelete = await admin.query(api.attachments.listAttachments, { assetId })
    expect(afterDelete).toHaveLength(0)

    const stored = await t.run(async (ctx) => ctx.storage.get(storageId))
    expect(stored).toBeNull()
  })
})
