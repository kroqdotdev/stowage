import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAuthenticatedUser } from "./authz";
import {
  addIntervalToIsoDate,
  getTodayIsoDate,
  normalizeServiceIntervalUnit,
  requireIsoDate,
} from "./service_schedule_helpers";
import {
  normalizeServiceRecordValues,
  throwServiceRecordError,
  type ServiceGroupFieldType,
} from "./service_record_helpers";

const recordValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

const recordValuesValidator = v.record(v.string(), recordValueValidator);

const serviceGroupFieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("date"),
  v.literal("checkbox"),
  v.literal("select"),
);

const recordFormFieldValidator = v.object({
  _id: v.id("serviceGroupFields"),
  label: v.string(),
  fieldType: serviceGroupFieldTypeValidator,
  required: v.boolean(),
  options: v.array(v.string()),
  sortOrder: v.number(),
});

const recordFormDefinitionValidator = v.object({
  assetId: v.id("assets"),
  assetName: v.string(),
  assetTag: v.string(),
  serviceGroupId: v.id("serviceGroups"),
  serviceGroupName: v.string(),
  scheduleId: v.union(v.id("serviceSchedules"), v.null()),
  nextServiceDate: v.union(v.string(), v.null()),
  fields: v.array(recordFormFieldValidator),
});

const serviceRecordValidator = v.object({
  _id: v.id("serviceRecords"),
  _creationTime: v.number(),
  assetId: v.id("assets"),
  serviceGroupId: v.id("serviceGroups"),
  serviceGroupName: v.string(),
  values: recordValuesValidator,
  scheduleId: v.union(v.id("serviceSchedules"), v.null()),
  scheduledForDate: v.union(v.string(), v.null()),
  completedAt: v.number(),
  completedBy: v.id("users"),
  completedByName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type AssetRow = {
  _id: Id<"assets">;
  name: string;
  assetTag: string;
  serviceGroupId?: Id<"serviceGroups"> | null;
};

type ServiceGroupRow = {
  _id: Id<"serviceGroups">;
  name: string;
};

type ServiceGroupFieldRow = {
  _id: Id<"serviceGroupFields">;
  groupId: Id<"serviceGroups">;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
};

type ServiceScheduleRow = {
  _id: Id<"serviceSchedules">;
  assetId: Id<"assets">;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: "days" | "weeks" | "months" | "years";
  reminderLeadValue: number;
  reminderLeadUnit: "days" | "weeks" | "months" | "years";
};

type ServiceRecordRow = {
  _id: Id<"serviceRecords">;
  _creationTime: number;
  assetId: Id<"assets">;
  serviceGroupId: Id<"serviceGroups">;
  values: Record<string, string | number | boolean | null>;
  scheduleId: Id<"serviceSchedules"> | null;
  scheduledForDate: string | null;
  completedAt: number;
  completedBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
};

async function requireAsset(
  ctx: QueryCtx | MutationCtx,
  assetId: Id<"assets">,
) {
  const asset = (await ctx.db.get(assetId)) as AssetRow | null;
  if (!asset) {
    throwServiceRecordError("ASSET_NOT_FOUND", "Asset not found");
  }
  return asset;
}

async function requireServiceGroup(
  ctx: QueryCtx | MutationCtx,
  serviceGroupId: Id<"serviceGroups">,
) {
  const group = (await ctx.db.get(serviceGroupId)) as ServiceGroupRow | null;
  if (!group) {
    throwServiceRecordError("GROUP_NOT_FOUND", "Service group not found");
  }
  return group;
}

async function listFieldsForGroup(
  ctx: QueryCtx | MutationCtx,
  serviceGroupId: Id<"serviceGroups">,
) {
  return (await ctx.db
    .query("serviceGroupFields")
    .withIndex("by_groupId_and_sortOrder", (q) =>
      q.eq("groupId", serviceGroupId),
    )
    .collect()) as ServiceGroupFieldRow[];
}

async function getScheduleForAsset(
  ctx: QueryCtx | MutationCtx,
  assetId: Id<"assets">,
) {
  return (await ctx.db
    .query("serviceSchedules")
    .withIndex("by_assetId", (q) => q.eq("assetId", assetId))
    .first()) as ServiceScheduleRow | null;
}

export const getRecordFormDefinition = query({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.union(recordFormDefinitionValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const asset = await requireAsset(ctx, args.assetId);
    if (!asset.serviceGroupId) {
      return null;
    }

    const [group, fields, schedule] = await Promise.all([
      requireServiceGroup(ctx, asset.serviceGroupId),
      listFieldsForGroup(ctx, asset.serviceGroupId),
      getScheduleForAsset(ctx, asset._id),
    ]);

    return {
      assetId: asset._id,
      assetName: asset.name,
      assetTag: asset.assetTag,
      serviceGroupId: group._id,
      serviceGroupName: group.name,
      scheduleId: schedule?._id ?? null,
      nextServiceDate: schedule?.nextServiceDate ?? null,
      fields: fields.map((field) => ({
        _id: field._id,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        options: field.options,
        sortOrder: field.sortOrder,
      })),
    };
  },
});

export const listAssetRecords = query({
  args: {
    assetId: v.id("assets"),
  },
  returns: v.array(serviceRecordValidator),
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    await requireAsset(ctx, args.assetId);

    const records = (await ctx.db
      .query("serviceRecords")
      .withIndex("by_assetId_and_completedAt", (q) =>
        q.eq("assetId", args.assetId),
      )
      .order("desc")
      .collect()) as ServiceRecordRow[];

    const [groups, users] = await Promise.all([
      Promise.all(records.map((record) => ctx.db.get(record.serviceGroupId))),
      Promise.all(records.map((record) => ctx.db.get(record.completedBy))),
    ]);

    return records.map((record, index) => {
      const group = groups[index] as ServiceGroupRow | null;
      const user = users[index] as { name?: string; email?: string } | null;
      return {
        _id: record._id,
        _creationTime: record._creationTime,
        assetId: record.assetId,
        serviceGroupId: record.serviceGroupId,
        serviceGroupName: group?.name ?? "Unknown group",
        values: record.values,
        scheduleId: record.scheduleId,
        scheduledForDate: record.scheduledForDate,
        completedAt: record.completedAt,
        completedBy: record.completedBy,
        completedByName: user?.name ?? user?.email ?? "Unknown user",
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
  },
});

export const createRecord = mutation({
  args: {
    assetId: v.id("assets"),
    values: recordValuesValidator,
    scheduledForDate: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({ recordId: v.id("serviceRecords") }),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    const asset = await requireAsset(ctx, args.assetId);
    if (!asset.serviceGroupId) {
      throwServiceRecordError(
        "ASSET_GROUP_REQUIRED",
        "Assign a service group before logging service",
      );
    }

    const [group, fields, schedule] = await Promise.all([
      requireServiceGroup(ctx, asset.serviceGroupId),
      listFieldsForGroup(ctx, asset.serviceGroupId),
      getScheduleForAsset(ctx, args.assetId),
    ]);

    const normalizedValues = normalizeServiceRecordValues({
      fields: fields.map((field) => ({
        _id: field._id as string,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        options: field.options,
      })),
      values: args.values,
    });

    const scheduledForDate =
      args.scheduledForDate === undefined || args.scheduledForDate === null
        ? schedule?.nextServiceDate ?? null
        : requireIsoDate(args.scheduledForDate);

    const now = Date.now();
    const recordId = await ctx.db.insert("serviceRecords", {
      assetId: asset._id,
      serviceGroupId: group._id,
      values: normalizedValues,
      scheduleId: schedule?._id ?? null,
      scheduledForDate,
      completedAt: now,
      completedBy: actor._id as Id<"users">,
      createdAt: now,
      updatedAt: now,
    });

    if (schedule) {
      const nextServiceDate = addIntervalToIsoDate({
        date: getTodayIsoDate(now),
        value: schedule.intervalValue,
        unit: normalizeServiceIntervalUnit(schedule.intervalUnit),
      });

      await ctx.db.patch(schedule._id, {
        nextServiceDate,
        updatedAt: now,
        updatedBy: actor._id as Id<"users">,
      });
    }

    return { recordId };
  },
});
