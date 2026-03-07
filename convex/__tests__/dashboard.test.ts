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
      name: role === "admin" ? "Admin" : "Member",
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

function isoDaysFromNow(daysFromNow: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

describe("dashboard functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
  });

  it("returns asset counts by status and keeps zero-count statuses", async () => {
    const admin = asUser(t, adminId);

    for (let index = 0; index < 3; index += 1) {
      await admin.mutation(api.assets.createAsset, {
        name: `Active ${index}`,
        categoryId: null,
        locationId: null,
        status: "active",
        notes: null,
        customFieldValues: {},
        tagIds: [],
      });
    }

    for (let index = 0; index < 2; index += 1) {
      await admin.mutation(api.assets.createAsset, {
        name: `Retired ${index}`,
        categoryId: null,
        locationId: null,
        status: "retired",
        notes: null,
        customFieldValues: {},
        tagIds: [],
      });
    }

    const counts = await admin.query(api.dashboard.getAssetCountsByStatus, {});

    expect(counts.totalAssets).toBe(5);
    expect(counts.statusCounts).toEqual({
      active: 3,
      in_storage: 0,
      under_repair: 0,
      retired: 2,
      disposed: 0,
    });
  });

  it("returns recent assets sorted by updatedAt descending", async () => {
    const admin = asUser(t, adminId);

    const first = await admin.mutation(api.assets.createAsset, {
      name: "First asset",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });
    const second = await admin.mutation(api.assets.createAsset, {
      name: "Second asset",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(first.assetId, {
        updatedAt: 1_700_000_000_300,
      });
      await ctx.db.patch(second.assetId, {
        updatedAt: 1_700_000_000_200,
      });
    });

    const recentAssets = await admin.query(api.dashboard.getRecentAssets, {});

    expect(recentAssets.map((asset) => asset._id)).toEqual([
      first.assetId,
      second.assetId,
    ]);
  });

  it("returns upcoming service preview with overdue count", async () => {
    const admin = asUser(t, adminId);

    const overdueAsset = await admin.mutation(api.assets.createAsset, {
      name: "Pump A",
      categoryId: null,
      locationId: null,
      status: "active",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });
    const upcomingAsset = await admin.mutation(api.assets.createAsset, {
      name: "Pump B",
      categoryId: null,
      locationId: null,
      status: "under_repair",
      notes: null,
      customFieldValues: {},
      tagIds: [],
    });

    await admin.mutation(api.serviceSchedules.upsertSchedule, {
      assetId: overdueAsset.assetId,
      nextServiceDate: isoDaysFromNow(-2),
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 2,
      reminderLeadUnit: "weeks",
    });
    await admin.mutation(api.serviceSchedules.upsertSchedule, {
      assetId: upcomingAsset.assetId,
      nextServiceDate: isoDaysFromNow(3),
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 2,
      reminderLeadUnit: "weeks",
    });

    const preview = await admin.query(api.dashboard.getUpcomingServicesPreview, {});

    expect(preview.serviceSchedulingEnabled).toBe(true);
    expect(preview.overdueCount).toBe(1);
    expect(preview.items).toHaveLength(2);
    expect(preview.items[0]?.assetName).toBe("Pump A");
    expect(preview.items[1]?.assetName).toBe("Pump B");
  });

  it("builds the overview payload with breakdowns and upcoming services", async () => {
    const admin = asUser(t, adminId);

    const category = await admin.mutation(api.categories.createCategory, {
      name: "HVAC",
      prefix: "HV",
      description: null,
      color: "#0F766E",
    });
    const location = await admin.mutation(api.locations.createLocation, {
      name: "Engine Room",
      parentId: null,
      description: null,
    });
    const created = await admin.mutation(api.assets.createAsset, {
      name: "Ventilation unit",
      categoryId: category.categoryId,
      locationId: location.locationId,
      status: "active",
      notes: "Primary fan bank",
      customFieldValues: {},
      tagIds: [],
    });

    await admin.mutation(api.serviceSchedules.upsertSchedule, {
      assetId: created.assetId,
      nextServiceDate: isoDaysFromNow(7),
      intervalValue: 1,
      intervalUnit: "months",
      reminderLeadValue: 1,
      reminderLeadUnit: "weeks",
    });

    const overview = await admin.query(api.dashboard.getOverview, {});

    expect(overview.totalAssets).toBe(1);
    expect(overview.categoryBreakdown).toEqual([
      {
        _id: category.categoryId,
        name: "HVAC",
        color: "#0F766E",
        count: 1,
      },
    ]);
    expect(overview.locationBreakdown).toEqual([
      {
        _id: location.locationId,
        name: "Engine Room",
        count: 1,
      },
    ]);
    expect(overview.upcomingServices[0]?.assetId).toBe(created.assetId);
    expect(overview.serviceSchedulingEnabled).toBe(true);
    expect(overview.dateFormat).toBe("DD-MM-YYYY");
  });
});
