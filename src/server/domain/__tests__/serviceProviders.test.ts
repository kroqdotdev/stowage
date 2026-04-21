import { describe, expect, it } from "vitest";

import {
  createProvider,
  deleteProvider,
  listProviderOptions,
  listProviders,
  updateProvider,
} from "@/server/domain/serviceProviders";
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

describe("serviceProviders domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("creates a provider with normalized fields", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const provider = await createProvider(ctx(), {
      name: "  Acme Repair  ",
      contactEmail: "  repairs@acme.test  ",
      contactPhone: "  +1-555-1234  ",
      notes: null,
      actorId: admin.id,
    });

    expect(provider).toMatchObject({
      name: "Acme Repair",
      contactEmail: "repairs@acme.test",
      contactPhone: "+1-555-1234",
      notes: null,
    });
  });

  it("rejects empty names", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createProvider(ctx(), { name: "   ", actorId: admin.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("lists providers sorted by name (case-insensitive)", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createProvider(ctx(), { name: "zeta", actorId: admin.id });
    await createProvider(ctx(), { name: "Alpha", actorId: admin.id });
    await createProvider(ctx(), { name: "beta", actorId: admin.id });

    const list = await listProviders(ctx());
    expect(list.map((p) => p.name)).toEqual(["Alpha", "beta", "zeta"]);

    const options = await listProviderOptions(ctx());
    expect(options.map((p) => p.name)).toEqual(["Alpha", "beta", "zeta"]);
  });

  it("rejects duplicate names regardless of case", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createProvider(ctx(), { name: "Acme", actorId: admin.id });
    await expect(
      createProvider(ctx(), { name: " ACME ", actorId: admin.id }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("updates an existing provider", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const provider = await createProvider(ctx(), {
      name: "Acme",
      actorId: admin.id,
    });
    const updated = await updateProvider(ctx(), {
      providerId: provider.id,
      name: "Acme Service",
      contactEmail: "service@acme.test",
      actorId: admin.id,
    });
    expect(updated).toMatchObject({
      name: "Acme Service",
      contactEmail: "service@acme.test",
      contactPhone: null,
    });
  });

  it("throws NotFoundError when updating a missing provider", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      updateProvider(ctx(), {
        providerId: "nonexistent0000",
        name: "Anything",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses to delete a provider referenced by a service record", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const provider = await createProvider(ctx(), {
      name: "Acme",
      actorId: admin.id,
    });
    const asset = await seedAsset(pb, admin.id);

    await pb.collection("serviceRecords").create({
      assetId: asset.id,
      values: {},
      providerId: provider.id,
      completedAt: Date.now(),
      completedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await expect(deleteProvider(ctx(), provider.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("deletes an unused provider", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const provider = await createProvider(ctx(), {
      name: "Temp",
      actorId: admin.id,
    });
    await expect(deleteProvider(ctx(), provider.id)).resolves.toBeUndefined();
    await expect(listProviders(ctx())).resolves.toEqual([]);
  });
});
