import { describe, expect, it } from "vitest";

import { createGroup } from "@/server/domain/serviceGroups";
import {
  createField,
  deleteField,
  listFields,
  reorderFields,
  updateField,
} from "@/server/domain/serviceGroupFields";
import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
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

describe("serviceGroupFields domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("creates fields in sort order within a group", async () => {
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
      required: false,
      actorId: admin.id,
    });
    await createField(ctx(), {
      groupId: group.id,
      label: "Notes",
      fieldType: "textarea",
      required: false,
      actorId: admin.id,
    });

    const fields = await listFields(ctx(), group.id);
    expect(fields.map((f) => f.label)).toEqual(["Outcome", "Notes"]);
    expect(fields.map((f) => f.sortOrder)).toEqual([0, 1]);
  });

  it("rejects duplicate field labels within a group but allows across groups", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group1 = await createGroup(ctx(), {
      name: "Inspection 1",
      actorId: admin.id,
    });
    const group2 = await createGroup(ctx(), {
      name: "Inspection 2",
      actorId: admin.id,
    });
    await createField(ctx(), {
      groupId: group1.id,
      label: "Outcome",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });
    await expect(
      createField(ctx(), {
        groupId: group1.id,
        label: " outcome ",
        fieldType: "text",
        required: false,
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      createField(ctx(), {
        groupId: group2.id,
        label: "Outcome",
        fieldType: "text",
        required: false,
        actorId: admin.id,
      }),
    ).resolves.toBeTruthy();
  });

  it("validates select fields require at least one option", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    await expect(
      createField(ctx(), {
        groupId: group.id,
        label: "Outcome",
        fieldType: "select",
        required: false,
        options: ["   "],
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("dedupes and trims select options", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    const field = await createField(ctx(), {
      groupId: group.id,
      label: "Outcome",
      fieldType: "select",
      required: false,
      options: [" Pass ", "pass", "Fail"],
      actorId: admin.id,
    });
    expect(field.options).toEqual(["Pass", "Fail"]);
  });

  it("updates a field and clears options when fieldType is not select", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    const field = await createField(ctx(), {
      groupId: group.id,
      label: "Outcome",
      fieldType: "select",
      required: false,
      options: ["Pass", "Fail"],
      actorId: admin.id,
    });

    const updated = await updateField(ctx(), {
      fieldId: field.id,
      label: "Outcome v2",
      fieldType: "text",
      required: true,
      options: [],
      actorId: admin.id,
    });
    expect(updated).toMatchObject({
      label: "Outcome v2",
      fieldType: "text",
      required: true,
      options: [],
    });
  });

  it("deletes a field and renumbers the remaining sort order", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    const a = await createField(ctx(), {
      groupId: group.id,
      label: "A",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });
    await createField(ctx(), {
      groupId: group.id,
      label: "B",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });
    await createField(ctx(), {
      groupId: group.id,
      label: "C",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });

    await deleteField(ctx(), a.id);
    const list = await listFields(ctx(), group.id);
    expect(list.map((f) => f.label)).toEqual(["B", "C"]);
    expect(list.map((f) => f.sortOrder)).toEqual([0, 1]);
  });

  it("reorders fields by ids", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    const a = await createField(ctx(), {
      groupId: group.id,
      label: "A",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });
    const b = await createField(ctx(), {
      groupId: group.id,
      label: "B",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });
    const c = await createField(ctx(), {
      groupId: group.id,
      label: "C",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });

    await reorderFields(ctx(), {
      groupId: group.id,
      fieldIds: [c.id, a.id, b.id],
    });
    const list = await listFields(ctx(), group.id);
    expect(list.map((f) => f.id)).toEqual([c.id, a.id, b.id]);
  });

  it("rejects reorder that omits or duplicates fields", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    const a = await createField(ctx(), {
      groupId: group.id,
      label: "A",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });
    const b = await createField(ctx(), {
      groupId: group.id,
      label: "B",
      fieldType: "text",
      required: false,
      actorId: admin.id,
    });

    await expect(
      reorderFields(ctx(), { groupId: group.id, fieldIds: [a.id] }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      reorderFields(ctx(), {
        groupId: group.id,
        fieldIds: [a.id, a.id, b.id],
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws NotFoundError when group is missing on listFields", async () => {
    await expect(listFields(ctx(), "nonexistent0000")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
