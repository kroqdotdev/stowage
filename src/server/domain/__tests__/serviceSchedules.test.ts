import { describe, expect, it } from "vitest";

import { updateServiceSchedulingEnabled } from "@/server/domain/appSettings";
import { createAsset } from "@/server/domain/assets";
import {
  deleteSchedule,
  getScheduleByAssetId,
  listCalendarMonth,
  listScheduledAssets,
  listUpcomingServiceDueInDays,
  upsertSchedule,
} from "@/server/domain/serviceSchedules";
import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  addIntervalToIsoDate,
  ensureReminderWithinInterval,
  getMonthRange,
  getTodayIsoDate,
  subtractIntervalFromIsoDate,
} from "@/server/pb/service-schedule";
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

describe("service schedule helpers", () => {
  it("adds and subtracts intervals across units", () => {
    expect(
      addIntervalToIsoDate({ date: "2024-01-31", value: 1, unit: "months" }),
    ).toBe("2024-03-02");
    expect(
      addIntervalToIsoDate({ date: "2024-02-29", value: 1, unit: "years" }),
    ).toBe("2025-03-01");
    expect(
      subtractIntervalFromIsoDate({
        date: "2024-03-15",
        value: 7,
        unit: "days",
      }),
    ).toBe("2024-03-08");
  });

  it("enforces reminder lead within interval", () => {
    expect(() =>
      ensureReminderWithinInterval({
        intervalValue: 30,
        intervalUnit: "days",
        reminderLeadValue: 30,
        reminderLeadUnit: "days",
      }),
    ).not.toThrow();
    expect(() =>
      ensureReminderWithinInterval({
        intervalValue: 30,
        intervalUnit: "days",
        reminderLeadValue: 2,
        reminderLeadUnit: "months",
      }),
    ).toThrow(ValidationError);
    expect(() =>
      ensureReminderWithinInterval({
        intervalValue: 0,
        intervalUnit: "days",
        reminderLeadValue: 0,
        reminderLeadUnit: "days",
      }),
    ).toThrow(ValidationError);
  });

  it("getMonthRange returns inclusive-start / exclusive-end bounds", () => {
    expect(getMonthRange({ year: 2024, month: 2 })).toEqual({
      monthStart: "2024-02-01",
      nextMonthStart: "2024-03-01",
    });
    expect(() => getMonthRange({ year: 2024, month: 13 })).toThrow(
      ValidationError,
    );
  });
});

describe("serviceSchedules domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("returns null when no schedule exists for an asset", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    await expect(getScheduleByAssetId(ctx(), assetId)).resolves.toBeNull();
  });

  it("creates a schedule and computes reminderStartDate", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const schedule = await upsertSchedule(ctx(), {
      assetId,
      nextServiceDate: "2030-06-01",
      intervalValue: 30,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });
    expect(schedule).toMatchObject({
      nextServiceDate: "2030-06-01",
      reminderStartDate: "2030-05-25",
    });
  });

  it("advances nextServiceDate by interval when requested date is today", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const today = getTodayIsoDate();
    const schedule = await upsertSchedule(ctx(), {
      assetId,
      nextServiceDate: today,
      intervalValue: 30,
      intervalUnit: "days",
      reminderLeadValue: 0,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });
    expect(schedule.nextServiceDate).not.toBe(today);
  });

  it("updates an existing schedule on repeated upsert", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    await upsertSchedule(ctx(), {
      assetId,
      nextServiceDate: "2030-06-01",
      intervalValue: 30,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });
    const second = await upsertSchedule(ctx(), {
      assetId,
      nextServiceDate: "2030-07-01",
      intervalValue: 60,
      intervalUnit: "days",
      reminderLeadValue: 14,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });
    expect(second).toMatchObject({
      nextServiceDate: "2030-07-01",
      intervalValue: 60,
      reminderLeadValue: 14,
    });
    const lookup = await getScheduleByAssetId(ctx(), assetId);
    expect(lookup?.id).toBe(second.id);
  });

  it("deletes an existing schedule (idempotent when absent)", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    await upsertSchedule(ctx(), {
      assetId,
      nextServiceDate: "2030-06-01",
      intervalValue: 30,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });

    await expect(deleteSchedule(ctx(), assetId)).resolves.toBeUndefined();
    await expect(deleteSchedule(ctx(), assetId)).resolves.toBeUndefined();
    await expect(getScheduleByAssetId(ctx(), assetId)).resolves.toBeNull();
  });

  it("rejects scheduling ops when globally disabled", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await updateServiceSchedulingEnabled(ctx(), {
      enabled: false,
      actorId: admin.id,
    });
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });

    await expect(
      upsertSchedule(ctx(), {
        assetId,
        nextServiceDate: "2030-06-01",
        intervalValue: 30,
        intervalUnit: "days",
        reminderLeadValue: 7,
        reminderLeadUnit: "days",
        actorId: admin.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws NotFoundError for missing assets", async () => {
    await expect(
      getScheduleByAssetId(ctx(), "nonexistent0000"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists schedules by calendar month and upcoming window", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId: laptop } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    const { assetId: monitor } = await createAsset(ctx(), {
      name: "Monitor",
      actorId: admin.id,
    });
    await upsertSchedule(ctx(), {
      assetId: laptop,
      nextServiceDate: "2030-06-15",
      intervalValue: 30,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });
    await upsertSchedule(ctx(), {
      assetId: monitor,
      nextServiceDate: "2030-07-15",
      intervalValue: 60,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      actorId: admin.id,
    });

    const month = await listCalendarMonth(ctx(), { year: 2030, month: 6 });
    expect(month).toHaveLength(1);
    expect(month[0].assetId).toBe(laptop);

    const listed = await listScheduledAssets(ctx());
    expect(listed.map((item) => item.assetId)).toEqual([laptop, monitor]);

    await expect(listUpcomingServiceDueInDays(ctx(), 0)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
