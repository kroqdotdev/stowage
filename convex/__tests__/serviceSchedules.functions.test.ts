import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    status: "active",
    notes: null,
    customFieldValues: {},
    tagIds: [],
  });
  return created.assetId;
}

describe("serviceSchedules functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let userId: Id<"users">;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00.000Z"));
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates and reads a schedule by assetId", async () => {
    const user = asUser(t, userId);
    const assetId = await createAsset(user, "Generator");

    const created = await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId,
      nextServiceDate: "2026-07-01",
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 2,
      reminderLeadUnit: "weeks",
    });

    expect(created.nextServiceDate).toBe("2026-07-01");
    expect(created.reminderStartDate).toBe("2026-06-17");

    const loaded = await user.query(api.serviceSchedules.getScheduleByAssetId, {
      assetId,
    });
    expect(loaded).not.toBeNull();
    expect(loaded?.nextServiceDate).toBe("2026-07-01");
  });

  it("normalizes nextServiceDate when user selects today", async () => {
    const user = asUser(t, userId);
    const assetId = await createAsset(user, "Compressor");

    const created = await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId,
      nextServiceDate: "2026-03-04",
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 1,
      reminderLeadUnit: "months",
    });

    expect(created.nextServiceDate).toBe("2026-09-04");
  });

  it("rejects reminder lead when it exceeds interval", async () => {
    const user = asUser(t, userId);
    const assetId = await createAsset(user, "Hydraulic Pump");

    await expect(
      user.mutation(api.serviceSchedules.upsertSchedule, {
        assetId,
        nextServiceDate: "2026-05-01",
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 2,
        reminderLeadUnit: "months",
      }),
    ).rejects.toThrow("Reminder lead must be less than or equal to interval");
  });

  it("sorts scheduled assets by nearest due date", async () => {
    const user = asUser(t, userId);
    const firstAssetId = await createAsset(user, "Bilge Pump");
    const secondAssetId = await createAsset(user, "Winch");

    await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId: firstAssetId,
      nextServiceDate: "2026-07-10",
      intervalValue: 3,
      intervalUnit: "months",
      reminderLeadValue: 1,
      reminderLeadUnit: "weeks",
    });
    await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId: secondAssetId,
      nextServiceDate: "2026-04-10",
      intervalValue: 3,
      intervalUnit: "months",
      reminderLeadValue: 1,
      reminderLeadUnit: "weeks",
    });

    const rows = await user.query(api.serviceSchedules.listScheduledAssets, {});
    expect(rows).toHaveLength(2);
    expect(rows[0]?.assetId).toBe(secondAssetId);
    expect(rows[1]?.assetId).toBe(firstAssetId);
  });

  it("filters month and upcoming range queries", async () => {
    const user = asUser(t, userId);
    const marchAssetId = await createAsset(user, "Radar");
    const aprilAssetId = await createAsset(user, "Sonar");

    await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId: marchAssetId,
      nextServiceDate: "2026-03-07",
      intervalValue: 1,
      intervalUnit: "months",
      reminderLeadValue: 2,
      reminderLeadUnit: "days",
    });
    await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId: aprilAssetId,
      nextServiceDate: "2026-04-15",
      intervalValue: 1,
      intervalUnit: "months",
      reminderLeadValue: 1,
      reminderLeadUnit: "weeks",
    });

    const marchRows = await user.query(api.serviceSchedules.listCalendarMonth, {
      year: 2026,
      month: 3,
    });
    expect(marchRows).toHaveLength(1);
    expect(marchRows[0]?.assetId).toBe(marchAssetId);

    const upcoming = await user.query(
      api.serviceSchedules.listUpcomingServiceDueInDays,
      {
        days: 7,
      },
    );
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.assetId).toBe(marchAssetId);
  });

  it("blocks schedule writes when scheduling is disabled", async () => {
    const admin = asUser(t, adminId);
    const user = asUser(t, userId);
    const assetId = await createAsset(user, "Main Engine");

    await admin.mutation(api.appSettings.updateServiceSchedulingEnabled, {
      enabled: false,
    });

    await expect(
      user.mutation(api.serviceSchedules.upsertSchedule, {
        assetId,
        nextServiceDate: "2026-06-01",
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 1,
        reminderLeadUnit: "weeks",
      }),
    ).rejects.toThrow("Service scheduling is currently disabled");
  });

  it("deletes an existing schedule", async () => {
    const user = asUser(t, userId);
    const assetId = await createAsset(user, "Generator");

    await user.mutation(api.serviceSchedules.upsertSchedule, {
      assetId,
      nextServiceDate: "2026-08-01",
      intervalValue: 2,
      intervalUnit: "months",
      reminderLeadValue: 1,
      reminderLeadUnit: "weeks",
    });

    await user.mutation(api.serviceSchedules.deleteSchedule, { assetId });

    const after = await user.query(api.serviceSchedules.getScheduleByAssetId, {
      assetId,
    });
    expect(after).toBeNull();
  });
});
