import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAssetExists } from "./assets_helpers";
import { requireAuthenticatedUser } from "./authz";
import {
  addIntervalToIsoDate,
  ensureReminderWithinInterval,
  getMonthRange,
  getTodayIsoDate,
  getUpcomingRange,
  normalizeServiceIntervalUnit,
  requireIsoDate,
  subtractIntervalFromIsoDate,
  throwServiceScheduleError,
} from "./service_schedule_helpers";

const intervalUnitValidator = v.union(
  v.literal("days"),
  v.literal("weeks"),
  v.literal("months"),
  v.literal("years"),
);

const serviceScheduleViewValidator = v.object({
  _id: v.id("serviceSchedules"),
  assetId: v.id("assets"),
  nextServiceDate: v.string(),
  intervalValue: v.number(),
  intervalUnit: intervalUnitValidator,
  reminderLeadValue: v.number(),
  reminderLeadUnit: intervalUnitValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
  reminderStartDate: v.string(),
});

const scheduledAssetViewValidator = v.object({
  scheduleId: v.id("serviceSchedules"),
  assetId: v.id("assets"),
  assetName: v.string(),
  assetTag: v.string(),
  assetStatus: v.union(
    v.literal("active"),
    v.literal("in_storage"),
    v.literal("under_repair"),
    v.literal("retired"),
    v.literal("disposed"),
  ),
  nextServiceDate: v.string(),
  intervalValue: v.number(),
  intervalUnit: intervalUnitValidator,
  reminderLeadValue: v.number(),
  reminderLeadUnit: intervalUnitValidator,
  reminderStartDate: v.string(),
  lastServiceDate: v.union(v.string(), v.null()),
  lastServiceDescription: v.union(v.string(), v.null()),
  lastServiceProviderName: v.union(v.string(), v.null()),
});

type ServiceScheduleRow = {
  _id: Id<"serviceSchedules">;
  assetId: Id<"assets">;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: "days" | "weeks" | "months" | "years";
  reminderLeadValue: number;
  reminderLeadUnit: "days" | "weeks" | "months" | "years";
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

type AssetRow = {
  _id: Id<"assets">;
  name: string;
  assetTag: string;
  status: "active" | "in_storage" | "under_repair" | "retired" | "disposed";
};

type AppSettingsRow = {
  _id: Id<"appSettings">;
  key: "global";
  serviceSchedulingEnabled?: boolean;
};

type ServiceRecordRow = {
  _id: Id<"serviceRecords">;
  assetId: Id<"assets">;
  serviceDate?: string;
  description?: string | null;
  providerId?: Id<"serviceProviders"> | null;
  completedAt: number;
};

type ServiceProviderRow = {
  _id: Id<"serviceProviders">;
  name: string;
};

function getRecordSortKey(record: ServiceRecordRow) {
  return (
    record.serviceDate ??
    new Date(record.completedAt).toISOString().slice(0, 10)
  );
}

async function isServiceSchedulingEnabled(ctx: QueryCtx | MutationCtx) {
  const row = (await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .first()) as AppSettingsRow | null;
  return row?.serviceSchedulingEnabled ?? true;
}

function toScheduleView(row: ServiceScheduleRow) {
  return {
    _id: row._id,
    assetId: row.assetId,
    nextServiceDate: row.nextServiceDate,
    intervalValue: row.intervalValue,
    intervalUnit: row.intervalUnit,
    reminderLeadValue: row.reminderLeadValue,
    reminderLeadUnit: row.reminderLeadUnit,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    reminderStartDate: subtractIntervalFromIsoDate({
      date: row.nextServiceDate,
      value: row.reminderLeadValue,
      unit: row.reminderLeadUnit,
    }),
  };
}

async function buildLatestRecordContext(
  ctx: QueryCtx,
  assetIds: Id<"assets">[],
) {
  if (assetIds.length === 0) {
    return new Map<
      Id<"assets">,
      {
        lastServiceDate: string | null;
        lastServiceDescription: string | null;
        lastServiceProviderName: string | null;
      }
    >();
  }

  const assetLatestRecords = (await Promise.all(
    assetIds.map((assetId) =>
      ctx.db
        .query("serviceRecords")
        .withIndex("by_assetId_and_completedAt", (q) =>
          q.eq("assetId", assetId),
        )
        .order("desc")
        .first(),
    ),
  )) as Array<ServiceRecordRow | null>;

  const latestByAssetId = new Map<Id<"assets">, ServiceRecordRow>();
  assetIds.forEach((assetId, index) => {
    const record = assetLatestRecords[index];
    if (record) {
      latestByAssetId.set(assetId, record);
    }
  });

  const providerIds = Array.from(
    new Set(
      Array.from(latestByAssetId.values())
        .map((record) => record.providerId ?? null)
        .filter((value): value is Id<"serviceProviders"> => value !== null),
    ),
  );
  const providers = await Promise.all(
    providerIds.map((providerId) => ctx.db.get(providerId)),
  );
  const providerById = new Map<Id<"serviceProviders">, ServiceProviderRow>();
  for (const provider of providers) {
    if (provider) {
      providerById.set(provider._id, {
        _id: provider._id,
        name: provider.name,
      });
    }
  }

  const contextByAssetId = new Map<
    Id<"assets">,
    {
      lastServiceDate: string | null;
      lastServiceDescription: string | null;
      lastServiceProviderName: string | null;
    }
  >();

  for (const assetId of assetIds) {
    const latest = latestByAssetId.get(assetId);
    contextByAssetId.set(assetId, {
      lastServiceDate: latest ? getRecordSortKey(latest) : null,
      lastServiceDescription: latest?.description ?? null,
      lastServiceProviderName: latest?.providerId
        ? (providerById.get(latest.providerId)?.name ?? null)
        : null,
    });
  }

  return contextByAssetId;
}

async function mapScheduledAssets(ctx: QueryCtx, rows: ServiceScheduleRow[]) {
  const [assets, latestRecordContext] = await Promise.all([
    Promise.all(
      rows.map((row) => ctx.db.get(row.assetId) as Promise<AssetRow | null>),
    ),
    buildLatestRecordContext(
      ctx,
      rows.map((row) => row.assetId),
    ),
  ]);

  const mapped: Array<{
    scheduleId: Id<"serviceSchedules">;
    assetId: Id<"assets">;
    assetName: string;
    assetTag: string;
    assetStatus: AssetRow["status"];
    nextServiceDate: string;
    intervalValue: number;
    intervalUnit: ServiceScheduleRow["intervalUnit"];
    reminderLeadValue: number;
    reminderLeadUnit: ServiceScheduleRow["reminderLeadUnit"];
    reminderStartDate: string;
    lastServiceDate: string | null;
    lastServiceDescription: string | null;
    lastServiceProviderName: string | null;
  }> = [];

  rows.forEach((row, index) => {
    const asset = assets[index];
    if (!asset) {
      return;
    }

    const latest = latestRecordContext.get(row.assetId);
    mapped.push({
      scheduleId: row._id,
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
      lastServiceDate: latest?.lastServiceDate ?? null,
      lastServiceDescription: latest?.lastServiceDescription ?? null,
      lastServiceProviderName: latest?.lastServiceProviderName ?? null,
    });
  });

  return mapped;
}

export const getScheduleByAssetId = query({
  args: { assetId: v.id("assets") },
  returns: v.union(serviceScheduleViewValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireAssetExists(ctx, args.assetId);

    const row = (await ctx.db
      .query("serviceSchedules")
      .withIndex("by_assetId", (q) => q.eq("assetId", args.assetId))
      .first()) as ServiceScheduleRow | null;

    if (!row) {
      return null;
    }

    return toScheduleView(row);
  },
});

// Access control: All authenticated users can create or update service
// schedules. This is by design for collaborative service management.
export const upsertSchedule = mutation({
  args: {
    assetId: v.id("assets"),
    nextServiceDate: v.string(),
    intervalValue: v.number(),
    intervalUnit: intervalUnitValidator,
    reminderLeadValue: v.number(),
    reminderLeadUnit: intervalUnitValidator,
  },
  returns: serviceScheduleViewValidator,
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    await requireAssetExists(ctx, args.assetId);

    if (!(await isServiceSchedulingEnabled(ctx))) {
      throwServiceScheduleError(
        "SCHEDULING_DISABLED",
        "Service scheduling is currently disabled by an admin",
      );
    }

    const intervalUnit = normalizeServiceIntervalUnit(args.intervalUnit);
    const reminderLeadUnit = normalizeServiceIntervalUnit(
      args.reminderLeadUnit,
    );

    ensureReminderWithinInterval({
      intervalValue: args.intervalValue,
      intervalUnit,
      reminderLeadValue: args.reminderLeadValue,
      reminderLeadUnit,
    });

    const requestedNextServiceDate = requireIsoDate(args.nextServiceDate);
    const today = getTodayIsoDate();
    const nextServiceDate =
      requestedNextServiceDate === today
        ? addIntervalToIsoDate({
            date: requestedNextServiceDate,
            value: args.intervalValue,
            unit: intervalUnit,
          })
        : requestedNextServiceDate;

    const existing = (await ctx.db
      .query("serviceSchedules")
      .withIndex("by_assetId", (q) => q.eq("assetId", args.assetId))
      .first()) as ServiceScheduleRow | null;

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        nextServiceDate,
        intervalValue: args.intervalValue,
        intervalUnit,
        reminderLeadValue: args.reminderLeadValue,
        reminderLeadUnit,
        updatedAt: now,
        updatedBy: actor._id as Id<"users">,
      });

      const updated = (await ctx.db.get(
        existing._id,
      )) as ServiceScheduleRow | null;
      if (!updated) {
        throwServiceScheduleError("SCHEDULE_NOT_FOUND", "Schedule not found");
      }
      return toScheduleView(updated);
    }

    const insertedId = await ctx.db.insert("serviceSchedules", {
      assetId: args.assetId,
      nextServiceDate,
      intervalValue: args.intervalValue,
      intervalUnit,
      reminderLeadValue: args.reminderLeadValue,
      reminderLeadUnit,
      createdAt: now,
      updatedAt: now,
      createdBy: actor._id as Id<"users">,
      updatedBy: actor._id as Id<"users">,
    });

    const created = (await ctx.db.get(insertedId)) as ServiceScheduleRow | null;
    if (!created) {
      throwServiceScheduleError("SCHEDULE_NOT_FOUND", "Schedule not found");
    }
    return toScheduleView(created);
  },
});

// Access control: All authenticated users can remove service schedules.
// Consistent with the collaborative access model used throughout Stowage.
export const deleteSchedule = mutation({
  args: { assetId: v.id("assets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireAssetExists(ctx, args.assetId);

    if (!(await isServiceSchedulingEnabled(ctx))) {
      throwServiceScheduleError(
        "SCHEDULING_DISABLED",
        "Service scheduling is currently disabled by an admin",
      );
    }

    const existing = (await ctx.db
      .query("serviceSchedules")
      .withIndex("by_assetId", (q) => q.eq("assetId", args.assetId))
      .first()) as ServiceScheduleRow | null;

    if (!existing) {
      return null;
    }

    await ctx.db.delete(existing._id);
    return null;
  },
});

export const listScheduledAssets = query({
  args: {},
  returns: v.array(scheduledAssetViewValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const rows = (await ctx.db
      .query("serviceSchedules")
      .withIndex("by_nextServiceDate")
      .collect()) as ServiceScheduleRow[];

    return mapScheduledAssets(ctx, rows);
  },
});

export const listCalendarMonth = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  returns: v.array(scheduledAssetViewValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const { monthStart, nextMonthStart } = getMonthRange({
      year: args.year,
      month: args.month,
    });

    const rows = (await ctx.db
      .query("serviceSchedules")
      .withIndex("by_nextServiceDate", (q) =>
        q
          .gte("nextServiceDate", monthStart)
          .lt("nextServiceDate", nextMonthStart),
      )
      .collect()) as ServiceScheduleRow[];

    return mapScheduledAssets(ctx, rows);
  },
});

export const listUpcomingServiceDueInDays = query({
  args: {
    days: v.number(),
  },
  returns: v.array(scheduledAssetViewValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const { startDate, endDate } = getUpcomingRange({ days: args.days });
    const endExclusive = addIntervalToIsoDate({
      date: endDate,
      value: 1,
      unit: "days",
    });

    const rows = (await ctx.db
      .query("serviceSchedules")
      .withIndex("by_nextServiceDate", (q) =>
        q.gte("nextServiceDate", startDate).lt("nextServiceDate", endExclusive),
      )
      .collect()) as ServiceScheduleRow[];

    return mapScheduledAssets(ctx, rows);
  },
});
