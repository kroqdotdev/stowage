import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

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
): Promise<Id<"assets">> {
  const created = await actor.mutation(api.assets.createAsset, {
    name,
    categoryId: null,
    locationId: null,
    serviceGroupId: null,
    status: "active",
    notes: null,
    customFieldValues: {},
    tagIds: [],
  });
  return created.assetId;
}

describe("serviceProviders functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
  });

  it("allows admins to create, update, and list providers", async () => {
    const admin = asUser(t, adminId);

    const created = await admin.mutation(api.serviceProviders.createProvider, {
      name: "Harbor Mechanics",
      contactEmail: "ops@example.com",
      contactPhone: "+45 55555555",
      notes: "Primary vendor",
    });

    await admin.mutation(api.serviceProviders.updateProvider, {
      providerId: created.providerId,
      name: "Harbor Mechanical Services",
      contactEmail: "service@example.com",
      contactPhone: "+45 55555556",
      notes: "Updated notes",
    });

    const providers = await admin.query(api.serviceProviders.listProviders, {});
    expect(providers).toHaveLength(1);
    expect(providers[0]?.name).toBe("Harbor Mechanical Services");
    expect(providers[0]?.contactEmail).toBe("service@example.com");
  });

  it("blocks non-admin provider writes", async () => {
    const user = asUser(t, userId);

    await expect(
      user.mutation(api.serviceProviders.createProvider, {
        name: "Unauthorized Provider",
        contactEmail: null,
        contactPhone: null,
        notes: null,
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("prevents deleting providers that are referenced by service records", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);

    const createdProvider = await admin.mutation(
      api.serviceProviders.createProvider,
      {
        name: "Dockside Repair",
        contactEmail: null,
        contactPhone: null,
        notes: null,
      },
    );
    const assetId = await createAsset(user, "Generator");

    await user.mutation(api.serviceRecords.createRecord, {
      assetId,
      serviceDate: "2026-03-04",
      description: "Manual service",
      providerId: createdProvider.providerId,
      values: {},
    });

    await expect(
      admin.mutation(api.serviceProviders.deleteProvider, {
        providerId: createdProvider.providerId,
      }),
    ).rejects.toThrow("cannot be deleted");
  });
});
