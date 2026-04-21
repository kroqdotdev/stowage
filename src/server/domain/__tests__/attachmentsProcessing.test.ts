import { beforeAll, describe, expect, it } from "vitest";

import { createAsset } from "@/server/domain/assets";
import { createAttachment, listAttachments } from "@/server/domain/attachments";
import { processAttachmentOptimization } from "@/server/domain/attachmentsProcessing";
import type { Ctx } from "@/server/pb/context";
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

// Generated in beforeAll using Jimp so the bytes round-trip cleanly.
let TINY_RED_PNG: Uint8Array<ArrayBuffer>;

// Minimal valid PDF that pdf-lib can parse.
const MINIMAL_PDF_SOURCE = `%PDF-1.4
1 0 obj <<>> endobj
2 0 obj << /Type /Catalog /Pages 3 0 R >> endobj
3 0 obj << /Type /Pages /Count 1 /Kids [4 0 R] >> endobj
4 0 obj << /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000034 00000 n
0000000073 00000 n
0000000117 00000 n
trailer << /Size 5 /Root 2 0 R >>
startxref
173
%%EOF`;

const MINIMAL_PDF = new TextEncoder().encode(MINIMAL_PDF_SOURCE);

describe("attachmentsProcessing", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  beforeAll(async () => {
    const { Jimp } = await import("jimp");
    const image = new Jimp({ width: 4, height: 4, color: 0xff0000ff });
    const buf = await image.getBuffer("image/png");
    TINY_RED_PNG = Uint8Array.from(buf);
  });

  it("marks a PNG ready and records an optimized size", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "tiny.png",
      fileType: "image/png",
      fileBuffer: TINY_RED_PNG,
      actorId: admin.id,
    });

    await processAttachmentOptimization(ctx(), attachmentId);

    const [entry] = await listAttachments(ctx(), assetId);
    expect(entry.status).toBe("ready");
    expect(entry.optimizationError).toBeNull();
    expect(entry.fileSizeOptimized).toBeGreaterThan(0);
    // Solid-color 4x4 JPEG has constant header overhead; we only assert
    // that optimization ran, not that it shrunk the file for a trivial image.
  });

  it("marks a PDF ready (round-trip through pdf-lib)", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "page.pdf",
      fileType: "application/pdf",
      fileBuffer: MINIMAL_PDF,
      actorId: admin.id,
    });

    await processAttachmentOptimization(ctx(), attachmentId);

    const [entry] = await listAttachments(ctx(), assetId);
    expect(entry.status).toBe("ready");
    expect(entry.optimizationError).toBeNull();
  });

  it("does nothing for an attachment already ready", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { attachmentId } = await createAttachment(ctx(), {
      assetId,
      fileName: "tiny.png",
      fileType: "image/png",
      fileBuffer: TINY_RED_PNG,
      actorId: admin.id,
    });

    await processAttachmentOptimization(ctx(), attachmentId);
    await processAttachmentOptimization(ctx(), attachmentId); // should be a no-op
    const [entry] = await listAttachments(ctx(), assetId);
    expect(entry.status).toBe("ready");
  });
});
