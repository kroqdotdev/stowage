import { describe, expect, it } from "vitest";

import { createAsset, updateAsset } from "@/server/domain/assets";
import {
  completeScheduledService,
  createRecord,
  deleteRecord,
  getRecordFormDefinition,
  listAssetRecords,
  updateRecord,
} from "@/server/domain/serviceRecords";
import { createGroup } from "@/server/domain/serviceGroups";
import { createField } from "@/server/domain/serviceGroupFields";
import { createProvider } from "@/server/domain/serviceProviders";
import { upsertSchedule } from "@/server/domain/serviceSchedules";
import type { Ctx } from "@/server/pb/context";
import { NotFoundError, ValidationError } from "@/server/pb/errors";
import { usePbHarness } from "@/test/pb-harness";

async function seedAdmin(pb: Ctx["pb"], name = "Admin User") {
  return pb.collection("users").create({
    name,
    email: `admin-${Math.random().toString(36).slice(2)}@stowage.local`,
    password: "password123",
    passwordConfirm: "password123",
    role: "admin",
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

describe("serviceRecords domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("getRecordFormDefinition returns asset metadata with empty fields", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const form = await getRecordFormDefinition(ctx(), { assetId });
    expect(form).toMatchObject({
      assetId,
      assetName: "Laptop",
      serviceGroupId: null,
      fields: [],
    });
  });

  it("returns the service group's fields when the asset is assigned to one", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    await createField(ctx(), {
      groupId: group.id,
      label: "Outcome",
      fieldType: "text",
      required: true,
      actorId: admin.id,
    });
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    await updateAsset(ctx(), {
      assetId,
      serviceGroupId: group.id,
      actorId: admin.id,
    });
    const form = await getRecordFormDefinition(ctx(), { assetId });
    expect(form.serviceGroupId).toBe(group.id);
    expect(form.fields.map((f) => f.label)).toEqual(["Outcome"]);
  });

  it("createRecord validates required fields and persists snapshots", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    const outcome = await createField(ctx(), {
      groupId: group.id,
      label: "Outcome",
      fieldType: "select",
      required: true,
      options: ["Pass", "Fail"],
      actorId: admin.id,
    });
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      serviceGroupId: group.id,
      actorId: admin.id,
    });

    await expect(
      createRecord(ctx(), {
        assetId,
        serviceDate: yesterday(),
        description: "Inspected",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    const { recordId } = await createRecord(ctx(), {
      assetId,
      serviceDate: yesterday(),
      description: "Inspected",
      values: { [outcome.id]: "Pass" },
      actorId: admin.id,
    });

    const records = await listAssetRecords(ctx(), assetId);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: recordId,
      serviceGroupId: group.id,
      serviceGroupName: "Inspection",
      description: "Inspected",
      providerId: null,
    });
    expect(records[0].valueEntries[0]).toMatchObject({
      fieldId: outcome.id,
      label: "Outcome",
      value: "Pass",
    });
  });

  it("rejects a service date in the future", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await expect(
      createRecord(ctx(), {
        assetId,
        serviceDate: future,
        description: "x",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates a record and preserves the field snapshot", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { recordId } = await createRecord(ctx(), {
      assetId,
      serviceDate: yesterday(),
      description: "First pass",
      actorId: admin.id,
    });
    await updateRecord(ctx(), {
      recordId,
      serviceDate: yesterday(),
      description: "Revised notes",
      actorId: admin.id,
      actorRole: "admin",
    });
    const records = await listAssetRecords(ctx(), assetId);
    expect(records[0].description).toBe("Revised notes");
  });

  it("deletes a record", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { recordId } = await createRecord(ctx(), {
      assetId,
      serviceDate: yesterday(),
      description: "First pass",
      actorId: admin.id,
    });
    await deleteRecord(ctx(), recordId, { id: admin.id, role: "admin" });
    await expect(listAssetRecords(ctx(), assetId)).resolves.toEqual([]);
  });

  it("completing a scheduled service advances the schedule", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const schedule = await upsertSchedule(ctx(), {
      assetId,
      nextServiceDate: "2030-06-01",
      intervalValue: 30,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });

    const result = await completeScheduledService(ctx(), {
      scheduleId: schedule.id,
      serviceDate: yesterday(),
      description: "Performed maintenance",
      actorId: admin.id,
    });
    const expectedNext = (() => {
      const [y, m, d] = yesterday().split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1, d + 30));
      return `${String(next.getUTCFullYear()).padStart(4, "0")}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
    })();
    expect(result.nextServiceDate).toBe(expectedNext);

    const updated = await pb
      .collection("serviceSchedules")
      .getOne<{ nextServiceDate: string }>(schedule.id);
    expect(updated.nextServiceDate).toBe(expectedNext);
  });

  it("createRecord with a provider links it", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const provider = await createProvider(ctx(), {
      name: "Acme",
      actorId: admin.id,
    });
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { recordId } = await createRecord(ctx(), {
      assetId,
      serviceDate: yesterday(),
      description: "Checked",
      providerId: provider.id,
      actorId: admin.id,
    });
    const records = await listAssetRecords(ctx(), assetId);
    expect(records.find((r) => r.id === recordId)).toMatchObject({
      providerId: provider.id,
      providerName: "Acme",
    });
  });

  it("throws NotFoundError when the asset or schedule is missing", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createRecord(ctx(), {
        assetId: "nonexistent0000",
        serviceDate: yesterday(),
        description: "x",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      completeScheduledService(ctx(), {
        scheduleId: "nonexistent0000",
        serviceDate: yesterday(),
        description: "x",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects non-admin actors editing another user's record", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const otherUser = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { recordId } = await createRecord(ctx(), {
      assetId,
      serviceDate: yesterday(),
      description: "Owned by admin",
      actorId: admin.id,
    });
    await expect(
      updateRecord(ctx(), {
        recordId,
        serviceDate: yesterday(),
        description: "Tampered",
        actorId: otherUser.id,
        actorRole: "user",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
