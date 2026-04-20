import { describe, expect, it } from "vitest";

import { createAsset } from "@/server/domain/assets";
import { createRecord } from "@/server/domain/serviceRecords";
import {
  createServiceRecordAttachment,
  deleteServiceRecordAttachment,
  listServiceRecordAttachments,
} from "@/server/domain/serviceRecordAttachments";
import type { Ctx } from "@/server/pb/context";
import {
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
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

async function seedUser(pb: Ctx["pb"]) {
  return pb.collection("users").create({
    email: `user-${Math.random().toString(36).slice(2)}@stowage.local`,
    password: "password123",
    passwordConfirm: "password123",
    role: "user",
    createdAt: Date.now(),
  });
}

function yesterday() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const TINY_PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

describe("serviceRecordAttachments domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  async function seedRecord(actor: { id: string }) {
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: actor.id,
    });
    const { recordId } = await createRecord(ctx(), {
      assetId,
      serviceDate: yesterday(),
      description: "Performed",
      actorId: actor.id,
    });
    return { assetId, recordId };
  }

  it("creates, lists, and deletes a service record attachment", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { recordId } = await seedRecord(admin);

    const { attachmentId } = await createServiceRecordAttachment(ctx(), {
      serviceRecordId: recordId,
      fileName: "invoice.pdf",
      fileType: "application/pdf",
      fileBuffer: TINY_PDF,
      actorId: admin.id,
      actorRole: "admin",
    });
    const list = await listServiceRecordAttachments(ctx(), recordId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: attachmentId,
      serviceRecordId: recordId,
      fileName: "invoice.pdf",
      fileKind: "pdf",
    });
    expect(list[0].url).toMatch(/\/api\/files\/serviceRecordAttachments\//);

    await deleteServiceRecordAttachment(ctx(), attachmentId, {
      id: admin.id,
      role: "admin",
    });
    await expect(
      listServiceRecordAttachments(ctx(), recordId),
    ).resolves.toEqual([]);
  });

  it("blocks non-admin users from editing another user's record attachments", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const other = await seedUser(pb);
    const { recordId } = await seedRecord(admin);

    await expect(
      createServiceRecordAttachment(ctx(), {
        serviceRecordId: recordId,
        fileName: "invoice.pdf",
        fileType: "application/pdf",
        fileBuffer: TINY_PDF,
        actorId: other.id,
        actorRole: "user",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("NotFoundError when the service record does not exist", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createServiceRecordAttachment(ctx(), {
        serviceRecordId: "nonexistent0000",
        fileName: "x.pdf",
        fileType: "application/pdf",
        fileBuffer: TINY_PDF,
        actorId: admin.id,
        actorRole: "admin",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects oversized files with a ValidationError", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { recordId } = await seedRecord(admin);
    const big = new Uint8Array(26 * 1024 * 1024);
    await expect(
      createServiceRecordAttachment(ctx(), {
        serviceRecordId: recordId,
        fileName: "big.pdf",
        fileType: "application/pdf",
        fileBuffer: big,
        actorId: admin.id,
        actorRole: "admin",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
