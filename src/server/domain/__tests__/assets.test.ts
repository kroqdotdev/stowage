import { describe, expect, it } from "vitest";

import {
  createAsset,
  deleteAsset,
  generateAssetTag,
  getAsset,
  getAssetTagIds,
  listAssets,
  updateAsset,
  updateAssetStatus,
} from "@/server/domain/assets";
import { createCategory } from "@/server/domain/categories";
import { createFieldDefinition } from "@/server/domain/customFields";
import { createLocation } from "@/server/domain/locations";
import { createTag } from "@/server/domain/tags";
import type { Ctx } from "@/server/pb/context";
import { NotFoundError, ValidationError } from "@/server/pb/errors";
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

describe("assets domain — tag generation", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("generates AST-0001 for the first asset without a category", async () => {
    const preview = await generateAssetTag(ctx(), null);
    expect(preview).toMatchObject({
      assetTag: "AST-0001",
      prefix: "AST",
      nextNumber: 1,
    });
  });

  it("uses the category prefix when provided", async () => {
    const category = await createCategory(ctx(), {
      name: "IT",
      prefix: "IT",
      color: "#2563EB",
    });
    const preview = await generateAssetTag(ctx(), category.id);
    expect(preview).toMatchObject({
      assetTag: "IT-0001",
      prefix: "IT",
      nextNumber: 1,
    });
  });

  it("increments within a prefix after assets are created", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const category = await createCategory(ctx(), {
      name: "IT",
      prefix: "IT",
      color: "#2563EB",
    });
    await createAsset(ctx(), {
      name: "Laptop",
      categoryId: category.id,
      actorId: admin.id,
    });
    await createAsset(ctx(), {
      name: "Desktop",
      categoryId: category.id,
      actorId: admin.id,
    });

    await expect(generateAssetTag(ctx(), category.id)).resolves.toMatchObject({
      assetTag: "IT-0003",
      nextNumber: 3,
    });
  });

  it("defaults to AST prefix when category has no prefix", async () => {
    const category = await createCategory(ctx(), {
      name: "Office",
      color: "#112233",
    });
    const preview = await generateAssetTag(ctx(), category.id);
    expect(preview.prefix).toBe("AST");
  });
});

describe("assets domain — CRUD", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("creates an asset with defaults and returns the generated tag", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "  Laptop  ",
      actorId: admin.id,
    });

    const asset = await getAsset(ctx(), assetId);
    expect(asset).toMatchObject({
      name: "Laptop",
      status: "active",
      assetTag: "AST-0001",
      tags: [],
      category: null,
      location: null,
    });
  });

  it("validates name is required and trims whitespace", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createAsset(ctx(), { name: "   ", actorId: admin.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a missing category reference", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createAsset(ctx(), {
        name: "Laptop",
        categoryId: "nonexistent0000",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a missing location reference", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createAsset(ctx(), {
        name: "Laptop",
        locationId: "nonexistent0000",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("validates required custom fields", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createFieldDefinition(ctx(), {
      name: "Serial",
      fieldType: "text",
      required: true,
    });

    await expect(
      createAsset(ctx(), { name: "Laptop", actorId: admin.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("validates custom field types (number, dropdown, url, date)", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const price = await createFieldDefinition(ctx(), {
      name: "Price",
      fieldType: "number",
      required: false,
    });
    const rating = await createFieldDefinition(ctx(), {
      name: "Condition",
      fieldType: "dropdown",
      required: false,
      options: ["New", "Used"],
    });
    const url = await createFieldDefinition(ctx(), {
      name: "Link",
      fieldType: "url",
      required: false,
    });
    const date = await createFieldDefinition(ctx(), {
      name: "Purchased",
      fieldType: "date",
      required: false,
    });

    await expect(
      createAsset(ctx(), {
        name: "A",
        customFieldValues: { [price.id]: "not a number" },
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      createAsset(ctx(), {
        name: "B",
        customFieldValues: { [rating.id]: "Mint" },
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      createAsset(ctx(), {
        name: "C",
        customFieldValues: { [url.id]: "not-a-url" },
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      createAsset(ctx(), {
        name: "D",
        customFieldValues: { [date.id]: "2023/01/01" },
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      createAsset(ctx(), {
        name: "E",
        customFieldValues: {
          [price.id]: 199.99,
          [rating.id]: "New",
          [url.id]: "https://example.test",
          [date.id]: "2024-01-15",
        },
        actorId: admin.id,
      }),
    ).resolves.toBeTruthy();
  });

  it("increments and decrements field usage counts as values come and go", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const field = await createFieldDefinition(ctx(), {
      name: "Serial",
      fieldType: "text",
      required: false,
    });

    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      customFieldValues: { [field.id]: "SN-123" },
      actorId: admin.id,
    });

    let definition = await pb
      .collection("customFieldDefinitions")
      .getOne<{ usageCount: number }>(field.id);
    expect(definition.usageCount).toBe(1);

    await updateAsset(ctx(), {
      assetId,
      customFieldValues: {},
      actorId: admin.id,
    });
    definition = await pb
      .collection("customFieldDefinitions")
      .getOne<{ usageCount: number }>(field.id);
    expect(definition.usageCount).toBe(0);

    await updateAsset(ctx(), {
      assetId,
      customFieldValues: { [field.id]: "SN-999" },
      actorId: admin.id,
    });
    definition = await pb
      .collection("customFieldDefinitions")
      .getOne<{ usageCount: number }>(field.id);
    expect(definition.usageCount).toBe(1);

    await deleteAsset(ctx(), assetId);
    definition = await pb
      .collection("customFieldDefinitions")
      .getOne<{ usageCount: number }>(field.id);
    expect(definition.usageCount).toBe(0);
  });

  it("writes asset tags on create and swaps them on update", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const alpha = await createTag(ctx(), { name: "Alpha", color: "#112233" });
    const beta = await createTag(ctx(), { name: "Beta", color: "#445566" });
    const gamma = await createTag(ctx(), { name: "Gamma", color: "#778899" });

    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      tagIds: [alpha.id, beta.id],
      actorId: admin.id,
    });
    await expect(getAssetTagIds(ctx(), assetId)).resolves.toEqual(
      expect.arrayContaining([alpha.id, beta.id]),
    );

    await updateAsset(ctx(), {
      assetId,
      tagIds: [gamma.id],
      actorId: admin.id,
    });
    const after = await getAssetTagIds(ctx(), assetId);
    expect(after).toEqual([gamma.id]);
  });

  it("filters and sorts list results", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const it = await createCategory(ctx(), {
      name: "IT",
      prefix: "IT",
      color: "#2563EB",
    });
    const office = await createCategory(ctx(), {
      name: "Office",
      color: "#112233",
    });
    const location = await createLocation(ctx(), { name: "Warehouse" });

    await createAsset(ctx(), {
      name: "Laptop",
      categoryId: it.id,
      locationId: location.id,
      actorId: admin.id,
    });
    await createAsset(ctx(), {
      name: "Monitor",
      categoryId: it.id,
      actorId: admin.id,
    });
    await createAsset(ctx(), {
      name: "Pen",
      categoryId: office.id,
      actorId: admin.id,
    });

    const byCategory = await listAssets(ctx(), { categoryId: it.id });
    expect(byCategory.map((a) => a.name).sort()).toEqual(["Laptop", "Monitor"]);

    const byLocation = await listAssets(ctx(), {
      locationId: location.id,
    });
    expect(byLocation.map((a) => a.name)).toEqual(["Laptop"]);

    const bySearch = await listAssets(ctx(), { search: "pen" });
    expect(bySearch.map((a) => a.name)).toEqual(["Pen"]);

    const byName = await listAssets(ctx(), {
      sortBy: "name",
      sortDirection: "asc",
    });
    expect(byName.map((a) => a.name)).toEqual(["Laptop", "Monitor", "Pen"]);
  });

  it("intersects tag filters when multiple tags are provided", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const alpha = await createTag(ctx(), { name: "Alpha", color: "#112233" });
    const beta = await createTag(ctx(), { name: "Beta", color: "#445566" });

    const first = await createAsset(ctx(), {
      name: "Both",
      tagIds: [alpha.id, beta.id],
      actorId: admin.id,
    });
    await createAsset(ctx(), {
      name: "Alpha only",
      tagIds: [alpha.id],
      actorId: admin.id,
    });
    await createAsset(ctx(), {
      name: "Beta only",
      tagIds: [beta.id],
      actorId: admin.id,
    });

    const bothTags = await listAssets(ctx(), {
      tagIds: [alpha.id, beta.id],
    });
    expect(bothTags.map((a) => a.id)).toEqual([first.assetId]);
  });

  it("updateAssetStatus changes only the status", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });

    await updateAssetStatus(ctx(), {
      assetId,
      status: "retired",
      actorId: admin.id,
    });
    const asset = await getAsset(ctx(), assetId);
    expect(asset?.status).toBe("retired");
  });

  it("getAsset returns null when missing", async () => {
    await expect(getAsset(ctx(), "nonexistent0000")).resolves.toBeNull();
  });

  it("deleteAsset cascades to asset tags, schedules, records", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const alpha = await createTag(ctx(), { name: "Alpha", color: "#112233" });
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      tagIds: [alpha.id],
      actorId: admin.id,
    });

    await pb.collection("serviceSchedules").create({
      assetId,
      nextServiceDate: "2030-01-01",
      intervalValue: 90,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: admin.id,
      updatedBy: admin.id,
    });
    const record = await pb.collection("serviceRecords").create({
      assetId,
      values: {},
      completedAt: Date.now(),
      completedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await pb.collection("serviceRecordAttachments").create({
      serviceRecordId: record.id,
      fileName: "log.txt",
      fileType: "text/plain",
      fileKind: "pdf",
      fileSize: 123,
      uploadedBy: admin.id,
      uploadedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await deleteAsset(ctx(), assetId);

    for (const collection of [
      "assetTags",
      "serviceSchedules",
      "serviceRecordAttachments",
      "serviceRecords",
    ]) {
      const remaining = await pb.collection(collection).getFullList();
      expect(remaining, `${collection} should be empty`).toHaveLength(0);
    }
    await expect(getAsset(ctx(), assetId)).resolves.toBeNull();
  });

  it("throws NotFoundError when updating or deleting an unknown asset", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      updateAsset(ctx(), { assetId: "nonexistent0000", actorId: admin.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      updateAssetStatus(ctx(), {
        assetId: "nonexistent0000",
        status: "retired",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteAsset(ctx(), "nonexistent0000")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
