import { describe, expect, it } from "vitest";

import {
  createGroup,
  deleteGroup,
  getGroup,
  listAssignableGroups,
  listGroups,
  listGroupAssets,
  updateGroup,
} from "@/server/domain/serviceGroups";
import { createField } from "@/server/domain/serviceGroupFields";
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

describe("serviceGroups domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("creates, reads, updates and lists a group", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const created = await createGroup(ctx(), {
      name: "  Annual inspection  ",
      description: "  mandatory  ",
      actorId: admin.id,
    });
    expect(created).toMatchObject({
      name: "Annual inspection",
      description: "mandatory",
    });

    const fetched = await getGroup(ctx(), created.id);
    expect(fetched?.id).toBe(created.id);

    const updated = await updateGroup(ctx(), {
      groupId: created.id,
      name: "Annual inspection v2",
      description: null,
      actorId: admin.id,
    });
    expect(updated.description).toBeNull();

    const list = await listGroups(ctx());
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ assetCount: 0, fieldCount: 0 });
  });

  it("rejects duplicate names regardless of case", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createGroup(ctx(), { name: "Inspection", actorId: admin.id });
    await expect(
      createGroup(ctx(), { name: " INSPECTION ", actorId: admin.id }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects empty names", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createGroup(ctx(), { name: "   ", actorId: admin.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("includes asset and field counts in summary", async () => {
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

    await pb.collection("assets").create({
      name: "Laptop",
      normalizedName: "laptop",
      assetTag: "AST-0001",
      status: "active",
      serviceGroupId: group.id,
      customFieldValues: {},
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const [summary] = await listGroups(ctx());
    expect(summary).toMatchObject({ assetCount: 1, fieldCount: 2 });
  });

  it("returns assets attached to a group sorted by name", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    for (const [i, name] of ["Zeta", "alpha", "Mike"].entries()) {
      await pb.collection("assets").create({
        name,
        normalizedName: name.toLowerCase(),
        assetTag: `AST-${i}`,
        status: "active",
        serviceGroupId: group.id,
        customFieldValues: {},
        createdBy: admin.id,
        updatedBy: admin.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    const assets = await listGroupAssets(ctx(), group.id);
    expect(assets.map((a) => a.name)).toEqual(["alpha", "Mike", "Zeta"]);
  });

  it("refuses to delete a group that assets reference", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const group = await createGroup(ctx(), {
      name: "Inspection",
      actorId: admin.id,
    });
    await pb.collection("assets").create({
      name: "Laptop",
      normalizedName: "laptop",
      assetTag: "AST-0001",
      status: "active",
      serviceGroupId: group.id,
      customFieldValues: {},
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await expect(deleteGroup(ctx(), group.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("deletes a group and cascades its fields", async () => {
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
    await expect(deleteGroup(ctx(), group.id)).resolves.toBeUndefined();
    const fields = await pb
      .collection("serviceGroupFields")
      .getFullList({ filter: `groupId = "${group.id}"` });
    expect(fields).toHaveLength(0);
  });

  it("throws NotFoundError on unknown group", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      updateGroup(ctx(), {
        groupId: "nonexistent0000",
        name: "x",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteGroup(ctx(), "nonexistent0000")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      listGroupAssets(ctx(), "nonexistent0000"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("listAssignableGroups returns simple name/id tuples", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createGroup(ctx(), { name: "b", actorId: admin.id });
    await createGroup(ctx(), { name: "A", actorId: admin.id });
    const list = await listAssignableGroups(ctx());
    expect(list.map((g) => g.name)).toEqual(["A", "b"]);
    expect(list[0]).toHaveProperty("id");
  });
});
