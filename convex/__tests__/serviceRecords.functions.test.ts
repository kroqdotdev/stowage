import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

const SIMPLE_PDF = Uint8Array.from(
  Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 120 Td (Hello PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n295\n%%EOF",
    "utf8",
  ),
);

async function insertUser(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user",
): Promise<Id<"users">> {
  return (await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: role === "admin" ? "Admin User" : "Member User",
      email: `${role}-${Math.random().toString(36).slice(2)}@example.com`,
      role,
      createdBy: null,
      createdAt: Date.now(),
    }),
  )) as Id<"users">;
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function createAsset(
  actor: ReturnType<typeof asUser>,
  name: string,
  serviceGroupId: Id<"serviceGroups"> | null = null,
): Promise<Id<"assets">> {
  const created = await actor.mutation(api.assets.createAsset, {
    name,
    categoryId: null,
    locationId: null,
    serviceGroupId,
    status: "active",
    notes: null,
    customFieldValues: {},
    tagIds: [],
  });
  return created.assetId;
}

async function createGroupWithRequiredField(
  admin: ReturnType<typeof asUser>,
) {
  const group = await admin.mutation(api.serviceGroups.createGroup, {
    name: "Engine Service Group",
    description: "Required service checklist",
  });

  await admin.mutation(api.serviceGroupFields.createField, {
    groupId: group.groupId,
    label: "Technician note",
    fieldType: "text",
    required: true,
    options: [],
  });

  await admin.mutation(api.serviceGroupFields.createField, {
    groupId: group.groupId,
    label: "Verified",
    fieldType: "checkbox",
    required: true,
    options: [],
  });

  return group.groupId;
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

describe("serviceRecords functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let userId: Id<"users">;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00.000Z"));
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a service record and advances schedule from today", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const groupId = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(user, "Main Engine", groupId);

    await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId,
      nextServiceDate: "2026-03-10",
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 2,
      reminderLeadUnit: "weeks",
    });

    const formDefinition = await user.query(
      api.serviceRecords.getRecordFormDefinition,
      { assetId },
    );
    expect(formDefinition).not.toBeNull();

    const values: Record<string, string | number | boolean | null> = {};
    values[formDefinition!.fields[0]!._id] = "Performed full inspection";
    values[formDefinition!.fields[1]!._id] = true;

    await user.mutation(api.serviceRecords.createRecord, {
      assetId,
      values,
    });

    const records = await user.query(api.serviceRecords.listAssetRecords, {
      assetId,
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.serviceGroupId).toBe(groupId);

    const schedule = await user.query(api.serviceSchedules.getScheduleByAssetId, {
      assetId,
    });
    expect(schedule?.nextServiceDate).toBe("2026-09-04");
  });

  it("rejects missing required fields", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const groupId = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(user, "Hydraulic Pump", groupId);

    await expect(
      user.mutation(api.serviceRecords.createRecord, {
        assetId,
        values: {},
      }),
    ).rejects.toThrow("Technician note is required");
  });

  it("uploads and deletes service record attachments", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const groupId = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(user, "Generator", groupId);

    const formDefinition = await user.query(
      api.serviceRecords.getRecordFormDefinition,
      { assetId },
    );
    const values: Record<string, string | number | boolean | null> = {};
    values[formDefinition!.fields[0]!._id] = "Checked generator";
    values[formDefinition!.fields[1]!._id] = true;
    const createdRecord = await user.mutation(api.serviceRecords.createRecord, {
      assetId,
      values,
    });

    const storageId = await storeFile(t, "application/pdf", SIMPLE_PDF);

    await user.mutation(api.serviceRecordAttachments.createAttachment, {
      serviceRecordId: createdRecord.recordId,
      storageId,
      fileName: "service-report.pdf",
      fileType: "application/pdf",
    });

    const attachments = await user.query(
      api.serviceRecordAttachments.listAttachments,
      {
        serviceRecordId: createdRecord.recordId,
      },
    );
    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.fileName).toBe("service-report.pdf");

    await user.mutation(api.serviceRecordAttachments.deleteAttachment, {
      attachmentId: attachments[0]!._id,
    });

    const afterDelete = await user.query(
      api.serviceRecordAttachments.listAttachments,
      {
        serviceRecordId: createdRecord.recordId,
      },
    );
    expect(afterDelete).toHaveLength(0);
  });
});
