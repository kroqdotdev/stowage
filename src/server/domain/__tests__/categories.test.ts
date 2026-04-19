import { describe, expect, it } from "vitest";

import {
  createCategory,
  listCategories,
  type CategoryView,
} from "@/server/domain/categories";
import {
  normalizeCatalogNameKey,
  normalizeHexColor,
  normalizeOptionalText,
  normalizePrefix,
  requireCatalogName,
} from "@/server/pb/catalog";
import type { Ctx } from "@/server/pb/context";
import { ConflictError, ValidationError } from "@/server/pb/errors";
import { usePbHarness } from "@/test/pb-harness";

describe("catalog helpers", () => {
  it("requires and normalizes category names", () => {
    expect(requireCatalogName("  Laptop Computers  ")).toBe("Laptop Computers");
    expect(normalizeCatalogNameKey("  Laptop Computers  ")).toBe(
      "laptop computers",
    );
    expect(() => requireCatalogName("   ")).toThrowError("Name is required");
  });

  it("normalizes optional prefix and description fields", () => {
    expect(normalizePrefix("  LAP  ")).toBe("LAP");
    expect(normalizePrefix("   ")).toBeNull();
    expect(normalizeOptionalText("  End user devices  ")).toBe(
      "End user devices",
    );
    expect(normalizeOptionalText(undefined)).toBeNull();
    expect(normalizeOptionalText(null)).toBeNull();
  });

  it("normalizes hex colors to uppercase 6-digit values", () => {
    expect(normalizeHexColor("#2563eb")).toBe("#2563EB");
    expect(normalizeHexColor("2563eb")).toBe("#2563EB");
    expect(normalizeHexColor("#abc")).toBe("#AABBCC");
    expect(() => normalizeHexColor("blue")).toThrowError(
      "Enter a valid hex color",
    );
  });
});

describe("categories domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("returns an empty list with no records", async () => {
    await expect(listCategories(ctx())).resolves.toEqual([]);
  });

  it("creates a category with normalized fields", async () => {
    const created = await createCategory(ctx(), {
      name: "  Laptop Computers  ",
      prefix: "  LAP  ",
      description: "  End user devices  ",
      color: "2563eb",
    });

    expect(created).toMatchObject({
      name: "Laptop Computers",
      prefix: "LAP",
      description: "End user devices",
      color: "#2563EB",
    });
    expect(created.id).toMatch(/^\w{15}$/);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBe(created.createdAt);
  });

  it("stores null for empty optional fields", async () => {
    const created = await createCategory(ctx(), {
      name: "Furniture",
      prefix: "   ",
      description: null,
      color: "#111111",
    });

    expect(created.prefix).toBeNull();
    expect(created.description).toBeNull();
  });

  it("lists categories sorted case-insensitively by name", async () => {
    await createCategory(ctx(), { name: "vehicles", color: "#000000" });
    await createCategory(ctx(), { name: "Appliances", color: "#111111" });
    await createCategory(ctx(), { name: "books", color: "#222222" });

    const list = await listCategories(ctx());
    expect(list.map((entry: CategoryView) => entry.name)).toEqual([
      "Appliances",
      "books",
      "vehicles",
    ]);
  });

  it("rejects duplicate names regardless of case or whitespace", async () => {
    await createCategory(ctx(), {
      name: "Tools",
      color: "#aaaaaa",
    });

    await expect(
      createCategory(ctx(), { name: " TOOLS ", color: "#bbbbbb" }),
    ).rejects.toBeInstanceOf(ConflictError);

    const list = await listCategories(ctx());
    expect(list).toHaveLength(1);
  });

  it("throws ValidationError on invalid hex color", async () => {
    await expect(
      createCategory(ctx(), { name: "Electronics", color: "not-a-color" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError on empty name", async () => {
    await expect(
      createCategory(ctx(), { name: "   ", color: "#000000" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("resets records between tests (isolation check)", async () => {
    const list = await listCategories(ctx());
    expect(list).toEqual([]);
  });
});
