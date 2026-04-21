import { describe, expect, it } from "vitest";

import { getAssetTags, setAssetTags } from "@/server/domain/assetTags";
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

async function seedAsset(pb: Ctx["pb"], adminId: string) {
  return pb.collection("assets").create({
    name: "Laptop",
    normalizedName: "laptop",
    assetTag: `AST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    status: "active",
    customFieldValues: {},
    createdBy: adminId,
    updatedBy: adminId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

describe("assetTags domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("returns empty list when asset has no tags", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const asset = await seedAsset(pb, admin.id);

    await expect(getAssetTags(ctx(), asset.id)).resolves.toEqual([]);
  });

  it("sets tags on an asset and dedupes inputs", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const asset = await seedAsset(pb, admin.id);
    const alpha = await createTag(ctx(), { name: "Alpha", color: "#112233" });
    const beta = await createTag(ctx(), { name: "Beta", color: "#445566" });

    await setAssetTags(ctx(), {
      assetId: asset.id,
      tagIds: [alpha.id, beta.id, alpha.id],
      actorId: admin.id,
    });

    const tags = await getAssetTags(ctx(), asset.id);
    expect(tags.map((t) => t.name)).toEqual(["Alpha", "Beta"]);
  });

  it("replaces existing tags on repeated calls", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const asset = await seedAsset(pb, admin.id);
    const alpha = await createTag(ctx(), { name: "Alpha", color: "#112233" });
    const beta = await createTag(ctx(), { name: "Beta", color: "#445566" });
    const gamma = await createTag(ctx(), { name: "Gamma", color: "#778899" });

    await setAssetTags(ctx(), {
      assetId: asset.id,
      tagIds: [alpha.id, beta.id],
      actorId: admin.id,
    });
    await setAssetTags(ctx(), {
      assetId: asset.id,
      tagIds: [beta.id, gamma.id],
      actorId: admin.id,
    });

    const tags = await getAssetTags(ctx(), asset.id);
    expect(tags.map((t) => t.name)).toEqual(["Beta", "Gamma"]);
  });

  it("rejects unknown tag ids", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const asset = await seedAsset(pb, admin.id);

    await expect(
      setAssetTags(ctx(), {
        assetId: asset.id,
        tagIds: ["nonexistent0000"],
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws NotFoundError when asset does not exist", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const alpha = await createTag(ctx(), { name: "Alpha", color: "#112233" });

    await expect(
      setAssetTags(ctx(), {
        assetId: "nonexistent0000",
        tagIds: [alpha.id],
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(getAssetTags(ctx(), "nonexistent0000")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
