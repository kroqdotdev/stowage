import { describe, expect, it } from "vitest";

import { createAsset } from "@/server/domain/assets";
import { createCategory } from "@/server/domain/categories";
import { createLocation } from "@/server/domain/locations";
import { searchAssets } from "@/server/domain/search";
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

describe("searchAssets", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("returns an empty list for very short queries", async () => {
    await expect(searchAssets(ctx(), "a")).resolves.toEqual([]);
    await expect(searchAssets(ctx(), " ")).resolves.toEqual([]);
  });

  it("ranks exact assetTag hits above name matches above notes", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const it = await createCategory(ctx(), {
      name: "IT",
      prefix: "LAP",
      color: "#2563EB",
    });

    const byTag = await createAsset(ctx(), {
      name: "Office keyboard",
      notes: "backup keyboard",
      categoryId: it.id,
      actorId: admin.id,
    });
    const byName = await createAsset(ctx(), {
      name: "LAP device",
      actorId: admin.id,
    });
    const byNotes = await createAsset(ctx(), {
      name: "Pen holder",
      notes: "Contains LAP stickers",
      actorId: admin.id,
    });

    const results = await searchAssets(ctx(), "LAP-0001");
    expect(results[0].id).toBe(byTag.assetId);

    const nameHits = await searchAssets(ctx(), "LAP");
    // assetTag prefix > name prefix > notes, so LAP-0001 asset first,
    // then "LAP device", then the notes-only hit.
    expect(nameHits.map((row) => row.id)).toEqual([
      byTag.assetId,
      byName.assetId,
      byNotes.assetId,
    ]);
  });

  it("joins category name and location path onto results", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const category = await createCategory(ctx(), {
      name: "IT",
      prefix: "IT",
      color: "#2563EB",
    });
    const location = await createLocation(ctx(), { name: "Warehouse" });
    await createAsset(ctx(), {
      name: "Thinkpad X1",
      categoryId: category.id,
      locationId: location.id,
      actorId: admin.id,
    });

    const results = await searchAssets(ctx(), "thinkpad");
    expect(results[0]).toMatchObject({
      categoryName: "IT",
      locationPath: "Warehouse",
    });
  });

  it("caps results at the configured limit", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    for (let i = 0; i < 15; i++) {
      await createAsset(ctx(), {
        name: `Laptop ${i}`,
        actorId: admin.id,
      });
    }
    const results = await searchAssets(ctx(), "laptop");
    expect(results.length).toBeLessThanOrEqual(10);
  });
});
