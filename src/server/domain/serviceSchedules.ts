import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { AssetStatus } from "@/server/pb/assets";
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
  getUpcomingRange,
  normalizeServiceIntervalUnit,
  requireIsoDate,
  SERVICE_INTERVAL_UNITS,
  type ServiceIntervalUnit,
  subtractIntervalFromIsoDate,
} from "@/server/pb/service-schedule";

const intervalUnitSchema = z.enum(SERVICE_INTERVAL_UNITS);

export const UpsertScheduleInput = z.object({
  assetId: z.string(),
  nextServiceDate: z.string(),
  intervalValue: z.number(),
  intervalUnit: intervalUnitSchema,
  reminderLeadValue: z.number(),
  reminderLeadUnit: intervalUnitSchema,
  actorId: z.string(),
});

export type UpsertScheduleInput = z.infer<typeof UpsertScheduleInput>;

export type ScheduleView = {
  id: string;
  assetId: string;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: number;
  reminderLeadUnit: ServiceIntervalUnit;
  reminderStartDate: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type ScheduledAssetView = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  assetStatus: AssetStatus;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: number;
  reminderLeadUnit: ServiceIntervalUnit;
  reminderStartDate: string;
  lastServiceDate: string | null;
  lastServiceDescription: string | null;
  lastServiceProviderName: string | null;
};

type ScheduleRecord = {
  id: string;
  assetId: string;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: number;
  reminderLeadUnit: ServiceIntervalUnit;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

type AssetRow = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
};

type ServiceRecordRow = {
  id: string;
  assetId: string;
  serviceDate?: string;
  description?: string | null;
  providerId?: string;
  completedAt: number;
};

type ServiceProviderRow = { id: string; name: string };

type AppSettingsRow = {
  serviceSchedulingEnabled?: boolean | null;
};

async function assertAssetExists(ctx: Ctx, assetId: string) {
  try {
    await ctx.pb.collection("assets").getOne(assetId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Asset not found");
    }
    throw error;
  }
}

async function isServiceSchedulingEnabled(ctx: Ctx): Promise<boolean> {
  try {
    const row = await ctx.pb
      .collection("appSettings")
      .getFirstListItem<AppSettingsRow>('key = "global"');
    return row.serviceSchedulingEnabled ?? true;
  } catch {
    return true;
  }
}

function toScheduleView(record: ScheduleRecord): ScheduleView {
  return {
    id: record.id,
    assetId: record.assetId,
    nextServiceDate: record.nextServiceDate,
    intervalValue: record.intervalValue,
    intervalUnit: record.intervalUnit,
    reminderLeadValue: record.reminderLeadValue,
    reminderLeadUnit: record.reminderLeadUnit,
    reminderStartDate: subtractIntervalFromIsoDate({
      date: record.nextServiceDate,
      value: record.reminderLeadValue,
      unit: record.reminderLeadUnit,
    }),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}

function escapeFilter(value: string) {
  return value.replace(/"/g, '\\"');
}

async function getScheduleRecord(
  ctx: Ctx,
  assetId: string,
): Promise<ScheduleRecord | null> {
  try {
    return await ctx.pb
      .collection("serviceSchedules")
      .getFirstListItem<ScheduleRecord>(`assetId = "${escapeFilter(assetId)}"`);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function buildLatestRecordContext(
  ctx: Ctx,
  assetIds: string[],
): Promise<
  Map<
    string,
    {
      lastServiceDate: string | null;
      lastServiceDescription: string | null;
      lastServiceProviderName: string | null;
    }
  >
> {
  const out = new Map<
    string,
    {
      lastServiceDate: string | null;
      lastServiceDescription: string | null;
      lastServiceProviderName: string | null;
    }
  >();
  if (assetIds.length === 0) return out;

  const latestRecords = await Promise.all(
    assetIds.map(async (assetId) => {
      try {
        return await ctx.pb
          .collection("serviceRecords")
          .getList<ServiceRecordRow>(1, 1, {
            filter: `assetId = "${escapeFilter(assetId)}"`,
            sort: "-completedAt",
          })
          .then((result) => result.items[0] ?? null);
      } catch {
        return null;
      }
    }),
  );

  const providerIds = [
    ...new Set(
      latestRecords
        .map((record) => record?.providerId)
        .filter((id): id is string => !!id),
    ),
  ];
  const providers = await Promise.all(
    providerIds.map((id) =>
      ctx.pb
        .collection("serviceProviders")
        .getOne<ServiceProviderRow>(id)
        .catch(() => null),
    ),
  );
  const providerById = new Map(
    (providers.filter(Boolean) as ServiceProviderRow[]).map((p) => [p.id, p]),
  );

  assetIds.forEach((assetId, index) => {
    const record = latestRecords[index];
    const lastServiceDate = record
      ? (record.serviceDate ??
        new Date(record.completedAt).toISOString().slice(0, 10))
      : null;
    out.set(assetId, {
      lastServiceDate,
      lastServiceDescription: record?.description ?? null,
      lastServiceProviderName: record?.providerId
        ? (providerById.get(record.providerId)?.name ?? null)
        : null,
    });
  });

  return out;
}

async function mapScheduledAssets(
  ctx: Ctx,
  records: ScheduleRecord[],
): Promise<ScheduledAssetView[]> {
  if (records.length === 0) return [];
  const assetIds = records.map((row) => row.assetId);
  const [assets, latestCtx] = await Promise.all([
    Promise.all(
      assetIds.map((id) =>
        ctx.pb
          .collection("assets")
          .getOne<AssetRow>(id)
          .catch(() => null),
      ),
    ),
    buildLatestRecordContext(ctx, assetIds),
  ]);

  const mapped: ScheduledAssetView[] = [];
  records.forEach((row, index) => {
    const asset = assets[index];
    if (!asset) return;
    const context = latestCtx.get(row.assetId);
    mapped.push({
      scheduleId: row.id,
      assetId: row.assetId,
      assetName: asset.name,
      assetTag: asset.assetTag,
      assetStatus: asset.status,
      nextServiceDate: row.nextServiceDate,
      intervalValue: row.intervalValue,
      intervalUnit: row.intervalUnit,
      reminderLeadValue: row.reminderLeadValue,
      reminderLeadUnit: row.reminderLeadUnit,
      reminderStartDate: subtractIntervalFromIsoDate({
        date: row.nextServiceDate,
        value: row.reminderLeadValue,
        unit: row.reminderLeadUnit,
      }),
      lastServiceDate: context?.lastServiceDate ?? null,
      lastServiceDescription: context?.lastServiceDescription ?? null,
      lastServiceProviderName: context?.lastServiceProviderName ?? null,
    });
  });
  return mapped;
}

export async function getScheduleByAssetId(
  ctx: Ctx,
  assetId: string,
): Promise<ScheduleView | null> {
  await assertAssetExists(ctx, assetId);
  const record = await getScheduleRecord(ctx, assetId);
  return record ? toScheduleView(record) : null;
}

export async function upsertSchedule(
  ctx: Ctx,
  input: UpsertScheduleInput,
): Promise<ScheduleView> {
  const parsed = UpsertScheduleInput.parse(input);
  await assertAssetExists(ctx, parsed.assetId);
  if (!(await isServiceSchedulingEnabled(ctx))) {
    throw new ConflictError(
      "Service scheduling is currently disabled by an admin",
    );
  }

  const intervalUnit = normalizeServiceIntervalUnit(parsed.intervalUnit);
  const reminderLeadUnit = normalizeServiceIntervalUnit(
    parsed.reminderLeadUnit,
  );
  ensureReminderWithinInterval({
    intervalValue: parsed.intervalValue,
    intervalUnit,
    reminderLeadValue: parsed.reminderLeadValue,
    reminderLeadUnit,
  });

  const requested = requireIsoDate(parsed.nextServiceDate);
  const today = getTodayIsoDate();
  const nextServiceDate =
    requested === today
      ? addIntervalToIsoDate({
          date: requested,
          value: parsed.intervalValue,
          unit: intervalUnit,
        })
      : requested;

  const existing = await getScheduleRecord(ctx, parsed.assetId);
  const now = Date.now();

  if (existing) {
    const updated = await ctx.pb
      .collection("serviceSchedules")
      .update<ScheduleRecord>(existing.id, {
        nextServiceDate,
        intervalValue: parsed.intervalValue,
        intervalUnit,
        reminderLeadValue: parsed.reminderLeadValue,
        reminderLeadUnit,
        updatedAt: now,
        updatedBy: parsed.actorId,
      });
    return toScheduleView(updated);
  }

  const created = await ctx.pb
    .collection("serviceSchedules")
    .create<ScheduleRecord>({
      assetId: parsed.assetId,
      nextServiceDate,
      intervalValue: parsed.intervalValue,
      intervalUnit,
      reminderLeadValue: parsed.reminderLeadValue,
      reminderLeadUnit,
      createdAt: now,
      updatedAt: now,
      createdBy: parsed.actorId,
      updatedBy: parsed.actorId,
    });
  return toScheduleView(created);
}

export async function deleteSchedule(
  ctx: Ctx,
  assetId: string,
): Promise<void> {
  await assertAssetExists(ctx, assetId);
  if (!(await isServiceSchedulingEnabled(ctx))) {
    throw new ConflictError(
      "Service scheduling is currently disabled by an admin",
    );
  }
  const existing = await getScheduleRecord(ctx, assetId);
  if (!existing) return;
  await ctx.pb.collection("serviceSchedules").delete(existing.id);
}

export async function listScheduledAssets(
  ctx: Ctx,
): Promise<ScheduledAssetView[]> {
  const rows = await ctx.pb
    .collection("serviceSchedules")
    .getFullList<ScheduleRecord>({ sort: "nextServiceDate" });
  return mapScheduledAssets(ctx, rows);
}

export async function listCalendarMonth(
  ctx: Ctx,
  input: { year: number; month: number },
): Promise<ScheduledAssetView[]> {
  const { monthStart, nextMonthStart } = getMonthRange(input);
  const rows = await ctx.pb
    .collection("serviceSchedules")
    .getFullList<ScheduleRecord>({
      filter: `nextServiceDate >= "${monthStart}" && nextServiceDate < "${nextMonthStart}"`,
      sort: "nextServiceDate",
    });
  return mapScheduledAssets(ctx, rows);
}

export async function listUpcomingServiceDueInDays(
  ctx: Ctx,
  days: number,
): Promise<ScheduledAssetView[]> {
  if (!Number.isInteger(days) || days <= 0) {
    throw new ValidationError("Days must be a positive integer");
  }
  const { startDate, endDate } = getUpcomingRange({ days });
  const endExclusive = addIntervalToIsoDate({
    date: endDate,
    value: 1,
    unit: "days",
  });
  const rows = await ctx.pb
    .collection("serviceSchedules")
    .getFullList<ScheduleRecord>({
      filter: `nextServiceDate >= "${startDate}" && nextServiceDate < "${endExclusive}"`,
      sort: "nextServiceDate",
    });
  return mapScheduledAssets(ctx, rows);
}
