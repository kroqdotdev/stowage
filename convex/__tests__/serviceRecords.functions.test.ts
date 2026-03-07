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

async function createGroupWithRequiredField(admin: ReturnType<typeof asUser>) {
  const group = await admin.mutation(api.serviceGroups.createGroup, {
    name: "Engine Service Group",
    description: "Required service checklist",
  });

  const noteField = await admin.mutation(api.serviceGroupFields.createField, {
    groupId: group.groupId,
    label: "Technician note",
    fieldType: "text",
    required: true,
    options: [],
  });

  const verifiedField = await admin.mutation(
    api.serviceGroupFields.createField,
    {
      groupId: group.groupId,
      label: "Verified",
      fieldType: "checkbox",
      required: true,
      options: [],
    },
  );

  return {
    groupId: group.groupId,
    noteFieldId: noteField.fieldId,
    verifiedFieldId: verifiedField.fieldId,
  };
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
  let otherUserId: Id<"users">;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00.000Z"));
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
    otherUserId = await insertUser(t, "user");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a scheduled service record and advances the next due date", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const group = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(user, "Main Engine", group.groupId);

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

    await user.mutation(api.serviceRecords.completeScheduledService, {
      scheduleId: formDefinition!.scheduleId!,
      serviceDate: "2026-03-04",
      description: "Performed full inspection",
      values,
    });

    const records = await user.query(api.serviceRecords.listAssetRecords, {
      assetId,
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.serviceGroupId).toBe(group.groupId);
    expect(records[0]?.serviceDate).toBe("2026-03-04");
    expect(records[0]?.description).toBe("Performed full inspection");

    const schedule = await user.query(
      api.serviceSchedules.getScheduleByAssetId,
      {
        assetId,
      },
    );
    expect(schedule?.nextServiceDate).toBe("2026-09-04");
  });

  it("advances the next due date when logging a manual record for a scheduled asset", async () => {
    const user = asUser(t, userId);
    const assetId = await createAsset(user, "Fuel Pump");

    await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId,
      nextServiceDate: "2026-03-10",
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 2,
      reminderLeadUnit: "weeks",
    });

    const result = await user.mutation(api.serviceRecords.createRecord, {
      assetId,
      serviceDate: "2026-03-04",
      description: "Manual service from asset detail",
      values: {},
    });

    expect(result.nextServiceDate).toBe("2026-09-04");

    const records = await user.query(api.serviceRecords.listAssetRecords, {
      assetId,
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.scheduleId).toBeNull();
    expect(records[0]?.scheduledForDate).toBeNull();

    const schedule = await user.query(
      api.serviceSchedules.getScheduleByAssetId,
      {
        assetId,
      },
    );
    expect(schedule?.nextServiceDate).toBe("2026-09-04");
  });

  it("rejects missing required fields", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const group = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(user, "Hydraulic Pump", group.groupId);

    await expect(
      user.mutation(api.serviceRecords.createRecord, {
        assetId,
        serviceDate: "2026-03-04",
        description: "Incomplete record",
        values: {},
      }),
    ).rejects.toThrow("Technician note is required");
  });

  it("uploads and deletes service record attachments", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const group = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(user, "Generator", group.groupId);

    const formDefinition = await user.query(
      api.serviceRecords.getRecordFormDefinition,
      { assetId },
    );
    const values: Record<string, string | number | boolean | null> = {};
    values[formDefinition!.fields[0]!._id] = "Checked generator";
    values[formDefinition!.fields[1]!._id] = true;
    const createdRecord = await user.mutation(api.serviceRecords.createRecord, {
      assetId,
      serviceDate: "2026-03-04",
      description: "Checked generator",
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

  it("preserves field labels for history and edit forms after group fields change", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const group = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(user, "Emergency Pump", group.groupId);

    const formDefinition = await user.query(
      api.serviceRecords.getRecordFormDefinition,
      { assetId },
    );
    const values: Record<string, string | number | boolean | null> = {};
    values[formDefinition!.fields[0]!._id] = "Original technician note";
    values[formDefinition!.fields[1]!._id] = true;

    const createdRecord = await user.mutation(api.serviceRecords.createRecord, {
      assetId,
      serviceDate: "2026-03-04",
      description: "Initial service",
      values,
    });

    await admin.mutation(api.serviceGroupFields.updateField, {
      fieldId: group.noteFieldId,
      label: "Updated technician note",
      fieldType: "text",
      required: true,
      options: [],
    });
    await admin.mutation(api.serviceGroupFields.deleteField, {
      fieldId: group.verifiedFieldId,
    });

    const records = await user.query(api.serviceRecords.listAssetRecords, {
      assetId,
    });
    expect(records[0]?.valueEntries).toEqual([
      {
        fieldId: formDefinition!.fields[0]!._id,
        label: "Technician note",
        value: "Original technician note",
      },
      {
        fieldId: formDefinition!.fields[1]!._id,
        label: "Verified",
        value: true,
      },
    ]);

    const editDefinition = await user.query(
      api.serviceRecords.getRecordFormDefinition,
      { assetId, recordId: createdRecord.recordId },
    );
    expect(editDefinition.fields.map((field) => field.label)).toEqual([
      "Technician note",
      "Verified",
    ]);

    await user.mutation(api.serviceRecords.updateRecord, {
      recordId: createdRecord.recordId,
      serviceDate: "2026-03-04",
      description: "Updated service",
      values: {
        [editDefinition.fields[0]!._id]: "Retested after edit",
        [editDefinition.fields[1]!._id]: true,
      },
    });

    const updatedRecords = await user.query(
      api.serviceRecords.listAssetRecords,
      {
        assetId,
      },
    );
    expect(updatedRecords[0]?.description).toBe("Updated service");
    expect(updatedRecords[0]?.valueEntries[0]?.label).toBe("Technician note");
  });

  it("blocks attachment mutations from non-owners", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const otherUser = asUser(t, otherUserId);
    const group = await createGroupWithRequiredField(admin);
    const assetId = await createAsset(
      user,
      "Auxiliary Generator",
      group.groupId,
    );

    const formDefinition = await user.query(
      api.serviceRecords.getRecordFormDefinition,
      { assetId },
    );
    const createdRecord = await user.mutation(api.serviceRecords.createRecord, {
      assetId,
      serviceDate: "2026-03-04",
      description: "Owner record",
      values: {
        [formDefinition!.fields[0]!._id]: "Owner note",
        [formDefinition!.fields[1]!._id]: true,
      },
    });

    const intruderStorageId = await storeFile(t, "application/pdf", SIMPLE_PDF);
    await expect(
      otherUser.mutation(api.serviceRecordAttachments.createAttachment, {
        serviceRecordId: createdRecord.recordId,
        storageId: intruderStorageId,
        fileName: "unauthorized.pdf",
        fileType: "application/pdf",
      }),
    ).rejects.toThrow("modify this service record attachment");

    const ownerStorageId = await storeFile(t, "application/pdf", SIMPLE_PDF);
    await user.mutation(api.serviceRecordAttachments.createAttachment, {
      serviceRecordId: createdRecord.recordId,
      storageId: ownerStorageId,
      fileName: "authorized.pdf",
      fileType: "application/pdf",
    });

    const attachments = await user.query(
      api.serviceRecordAttachments.listAttachments,
      {
        serviceRecordId: createdRecord.recordId,
      },
    );

    await expect(
      otherUser.mutation(api.serviceRecordAttachments.deleteAttachment, {
        attachmentId: attachments[0]!._id,
      }),
    ).rejects.toThrow("modify this service record attachment");
  });
});
