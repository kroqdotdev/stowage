import { describe, expect, it } from "vitest";

import {
  createTag,
  deleteTag,
  listTags,
  updateTag,
  type TagView,
} from "@/server/domain/tags";
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

describe("tag helpers", () => {
  it("builds a stable duplicate-check key for tag names", async () => {
    const { normalizeCatalogNameKey } = await import("@/server/pb/catalog");
    expect(normalizeCatalogNameKey("  Fragile  ")).toBe("fragile");
    expect(normalizeCatalogNameKey("fragile")).toBe("fragile");
    expect(normalizeCatalogNameKey("FRAGILE")).toBe("fragile");
  });

  it("validates tag names", async () => {
    const { requireCatalogName } = await import("@/server/pb/catalog");
    expect(requireCatalogName("Urgent")).toBe("Urgent");
    expect(() => requireCatalogName("")).toThrowError("Name is required");
  });

  it("normalizes tag colors", async () => {
    const { normalizeHexColor } = await import("@/server/pb/catalog");
    expect(normalizeHexColor("#e11d48")).toBe("#E11D48");
    expect(() => normalizeHexColor("#12")).toThrowError(
      "Enter a valid hex color",
    );
  });
});

describe("tags domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("returns an empty list initially", async () => {
    await expect(listTags(ctx())).resolves.toEqual([]);
  });

  it("creates a tag with normalized name and uppercased hex color", async () => {
    const tag = await createTag(ctx(), {
      name: "  Fragile  ",
      color: "e11d48",
    });

    expect(tag).toMatchObject({ name: "Fragile", color: "#E11D48" });
    expect(tag.createdAt).toBe(tag.updatedAt);
  });

  it("lists tags sorted case-insensitively by name", async () => {
    await createTag(ctx(), { name: "urgent", color: "#112233" });
    await createTag(ctx(), { name: "Fragile", color: "#445566" });
    await createTag(ctx(), { name: "archived", color: "#778899" });

    const list = await listTags(ctx());
    expect(list.map((tag: TagView) => tag.name)).toEqual([
      "archived",
      "Fragile",
      "urgent",
    ]);
  });

  it("rejects duplicate tag names regardless of case or whitespace", async () => {
    await createTag(ctx(), { name: "Fragile", color: "#E11D48" });

    await expect(
      createTag(ctx(), { name: " FRAGILE ", color: "#000000" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("updates a tag in place", async () => {
    const created = await createTag(ctx(), {
      name: "Keep Dry",
      color: "#000000",
    });

    const updated = await updateTag(ctx(), {
      tagId: created.id,
      name: "Keep Very Dry",
      color: "#ffffff",
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Keep Very Dry");
    expect(updated.color).toBe("#FFFFFF");
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
  });

  it("rejects an update that would collide with another tag's name", async () => {
    await createTag(ctx(), { name: "Fragile", color: "#E11D48" });
    const other = await createTag(ctx(), { name: "Urgent", color: "#000000" });

    await expect(
      updateTag(ctx(), {
        tagId: other.id,
        name: " fragile ",
        color: "#000000",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows updating a tag to its own normalized name", async () => {
    const tag = await createTag(ctx(), {
      name: "Fragile",
      color: "#E11D48",
    });

    const updated = await updateTag(ctx(), {
      tagId: tag.id,
      name: "fragile",
      color: "#112233",
    });

    expect(updated.name).toBe("fragile");
    expect(updated.color).toBe("#112233");
  });

  it("throws NotFoundError when updating a tag that does not exist", async () => {
    await expect(
      updateTag(ctx(), {
        tagId: "nonexistent0000",
        name: "Anything",
        color: "#000000",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ValidationError on invalid hex color", async () => {
    await expect(
      createTag(ctx(), { name: "Broken", color: "not-a-color" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("deletes a tag that is not linked to any asset", async () => {
    const tag = await createTag(ctx(), { name: "Temp", color: "#112233" });

    await expect(deleteTag(ctx(), tag.id)).resolves.toBeUndefined();
    await expect(listTags(ctx())).resolves.toEqual([]);
  });

  it("refuses to delete a tag that is in use on an asset", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);

    const tag = await createTag(ctx(), { name: "InUse", color: "#112233" });

    const asset = await pb.collection("assets").create({
      name: "Laptop",
      normalizedName: "laptop",
      assetTag: "AST-0001",
      status: "active",
      customFieldValues: {},
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await pb.collection("assetTags").create({
      assetId: asset.id,
      tagId: tag.id,
      createdBy: admin.id,
      createdAt: Date.now(),
    });

    await expect(deleteTag(ctx(), tag.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("throws NotFoundError when deleting a tag that does not exist", async () => {
    await expect(
      deleteTag(ctx(), "nonexistent0000"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
