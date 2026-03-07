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
  normalizeServiceIntervalUnit,
  requireIsoDate,
} from "./service_schedule_helpers";
import {
  normalizeServiceRecordValues,
  type ServiceGroupFieldType,
  throwServiceRecordError,
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
  _id: v.string(),
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
  serviceGroupId: v.union(v.id("serviceGroups"), v.null()),
  serviceGroupName: v.union(v.string(), v.null()),
  scheduleId: v.union(v.id("serviceSchedules"), v.null()),
  nextServiceDate: v.union(v.string(), v.null()),
  fields: v.array(recordFormFieldValidator),
});

const recordValueEntryValidator = v.object({
  fieldId: v.string(),
  label: v.string(),
  value: recordValueValidator,
});

const serviceRecordValidator = v.object({
  _id: v.id("serviceRecords"),
  _creationTime: v.number(),
  assetId: v.id("assets"),
  serviceGroupId: v.union(v.id("serviceGroups"), v.null()),
  serviceGroupName: v.union(v.string(), v.null()),
  values: recordValuesValidator,
  valueEntries: v.array(recordValueEntryValidator),
  scheduleId: v.union(v.id("serviceSchedules"), v.null()),
  scheduledForDate: v.union(v.string(), v.null()),
  serviceDate: v.string(),
  description: v.string(),
  cost: v.union(v.number(), v.null()),
  providerId: v.union(v.id("serviceProviders"), v.null()),
  providerName: v.union(v.string(), v.null()),
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

type RecordFieldDefinition = {
  _id: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
};

type StoredRecordFieldSnapshot = {
  fieldId: string;
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
};

type ServiceProviderRow = {
  _id: Id<"serviceProviders">;
  name: string;
};

type ServiceRecordRow = {
  _id: Id<"serviceRecords">;
  _creationTime: number;
  assetId: Id<"assets">;
  serviceGroupId: Id<"serviceGroups"> | null;
  serviceGroupNameSnapshot?: string | null;
  values: Record<string, string | number | boolean | null>;
  fieldSnapshots?: StoredRecordFieldSnapshot[];
  scheduleId: Id<"serviceSchedules"> | null;
  scheduledForDate: string | null;
  serviceDate?: string;
  description?: string | null;
  cost?: number | null;
  providerId?: Id<"serviceProviders"> | null;
  completedAt: number;
  completedBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
};

type AuthActor = {
  _id: string;
  role: "admin" | "user";
};

type UserSummary = {
  _id: Id<"users">;
  name?: string;
  email?: string;
};

function timestampToIsoDate(timestamp: number) {
  const date = new Date(timestamp);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function requireServiceDate(value: string) {
  const serviceDate = requireIsoDate(value);
  const today = timestampToIsoDate(Date.now());
  if (serviceDate > today) {
    throwServiceRecordError(
      "INVALID_SERVICE_DATE",
      "Service date cannot be in the future",
    );
  }
  return serviceDate;
}

function requireServiceDescription(value: string) {
  const description = value.trim();
  if (!description) {
    throwServiceRecordError(
      "MISSING_REQUIRED_FIELD",
      "Description is required",
    );
  }
  return description;
}

function normalizeServiceCost(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    throwServiceRecordError(
      "INVALID_FIELD_VALUE",
      "Cost must be a positive number",
    );
  }

  return value;
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

function mapServiceGroupFieldRows(
  fields: ServiceGroupFieldRow[],
): RecordFieldDefinition[] {
  return fields.map((field) => ({
    _id: String(field._id),
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    options: [...field.options],
    sortOrder: field.sortOrder,
  }));
}

function getRecordSnapshotFields(
  record: ServiceRecordRow,
): RecordFieldDefinition[] | undefined {
  if (record.fieldSnapshots === undefined) {
    return undefined;
  }

  return record.fieldSnapshots.map((field) => ({
    _id: field.fieldId,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    options: [...field.options],
    sortOrder: field.sortOrder,
  }));
}

function snapshotRecordFields(
  fields: RecordFieldDefinition[],
): StoredRecordFieldSnapshot[] {
  return fields.map((field) => ({
    fieldId: field._id,
    label: field.label,
    fieldType: field.fieldType,
    required: field.required,
    options: [...field.options],
    sortOrder: field.sortOrder,
  }));
}

async function requireSchedule(
  ctx: QueryCtx | MutationCtx,
  scheduleId: Id<"serviceSchedules">,
) {
  const schedule = (await ctx.db.get(scheduleId)) as ServiceScheduleRow | null;
  if (!schedule) {
    throwServiceRecordError("SCHEDULE_NOT_FOUND", "Schedule not found");
  }
  return schedule;
}

async function requireProvider(
  ctx: QueryCtx | MutationCtx,
  providerId: Id<"serviceProviders">,
) {
  const provider = (await ctx.db.get(providerId)) as ServiceProviderRow | null;
  if (!provider) {
    throwServiceRecordError("PROVIDER_NOT_FOUND", "Service provider not found");
  }
  return provider;
}

async function requireRecord(
  ctx: QueryCtx | MutationCtx,
  recordId: Id<"serviceRecords">,
) {
  const record = (await ctx.db.get(recordId)) as ServiceRecordRow | null;
  if (!record) {
    throwServiceRecordError("RECORD_NOT_FOUND", "Service record not found");
  }
  return record;
}

function ensureRecordAccess(actor: AuthActor, record: ServiceRecordRow) {
  if (actor.role === "admin") {
    return;
  }

  if (actor._id !== record.completedBy) {
    throwServiceRecordError(
      "FORBIDDEN",
      "You do not have access to modify this service record",
    );
  }
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

function getAdvancedNextServiceDate({
  schedule,
  serviceDate,
}: {
  schedule: ServiceScheduleRow;
  serviceDate: string;
}) {
  return addIntervalToIsoDate({
    date: serviceDate,
    value: schedule.intervalValue,
    unit: normalizeServiceIntervalUnit(schedule.intervalUnit),
  });
}

async function getRecordGroupContext(
  ctx: QueryCtx | MutationCtx,
  serviceGroupId: Id<"serviceGroups"> | null,
) {
  if (!serviceGroupId) {
    return {
      group: null,
      fields: [] as ServiceGroupFieldRow[],
    };
  }

  const [group, fields] = await Promise.all([
    requireServiceGroup(ctx, serviceGroupId),
    listFieldsForGroup(ctx, serviceGroupId),
  ]);

  return {
    group,
    fields,
  };
}

function normalizeRecordValuesForGroup({
  fields,
  values,
}: {
  fields: RecordFieldDefinition[];
  values: Record<string, string | number | boolean | null> | undefined;
}) {
  if (fields.length === 0) {
    if (values && Object.keys(values).length > 0) {
      throwServiceRecordError(
        "FIELD_NOT_FOUND",
        "This asset does not require configurable service fields",
      );
    }
    return {} as Record<string, string | number | boolean | null>;
  }

  return normalizeServiceRecordValues({
    fields: fields.map((field) => ({
      _id: field._id,
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      options: field.options,
    })),
    values: values ?? {},
  });
}

function buildValueEntries({
  record,
  fields,
}: {
  record: ServiceRecordRow;
  fields: RecordFieldDefinition[];
}) {
  const labelById = new Map(
    fields.map((field) => [field._id, field.label] as const),
  );
  const fieldIdSet = new Set(fields.map((field) => field._id));

  const orderedFieldEntries = fields
    .filter((field) =>
      Object.prototype.hasOwnProperty.call(record.values, field._id),
    )
    .map((field) => ({
      fieldId: field._id,
      label: field.label,
      value: record.values[field._id] ?? null,
    }));

  const unknownEntries = Object.entries(record.values)
    .filter(([fieldId]) => !fieldIdSet.has(fieldId))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([fieldId, value]) => ({
      fieldId,
      label: labelById.get(fieldId) ?? fieldId,
      value,
    }));

  return [...orderedFieldEntries, ...unknownEntries];
}

export const getRecordFormDefinition = query({
  args: {
    assetId: v.id("assets"),
    recordId: v.optional(v.id("serviceRecords")),
  },
  returns: recordFormDefinitionValidator,
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);
    const asset = await requireAssetExists(ctx, args.assetId);
    const record = args.recordId
      ? await requireRecord(ctx, args.recordId)
      : null;
    if (record && record.assetId !== asset._id) {
      throwServiceRecordError(
        "RECORD_NOT_FOUND",
        "Service record does not belong to this asset",
      );
    }

    const schedule = await getScheduleForAsset(ctx, asset._id);
    const snapshotFields = record ? getRecordSnapshotFields(record) : null;

    if (record && snapshotFields) {
      return {
        assetId: asset._id,
        assetName: asset.name,
        assetTag: asset.assetTag,
        serviceGroupId: record.serviceGroupId,
        serviceGroupName: record.serviceGroupNameSnapshot ?? null,
        scheduleId: schedule?._id ?? null,
        nextServiceDate: schedule?.nextServiceDate ?? null,
        fields: snapshotFields.map((field) => ({
          _id: field._id,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          options: [...field.options],
          sortOrder: field.sortOrder,
        })),
      };
    }

    const groupContext = await getRecordGroupContext(
      ctx,
      record ? record.serviceGroupId : (asset.serviceGroupId ?? null),
    );
    const formFields = mapServiceGroupFieldRows(groupContext.fields);

    return {
      assetId: asset._id,
      assetName: asset.name,
      assetTag: asset.assetTag,
      serviceGroupId: groupContext.group?._id ?? null,
      serviceGroupName: groupContext.group?.name ?? null,
      scheduleId: schedule?._id ?? null,
      nextServiceDate: schedule?.nextServiceDate ?? null,
      fields: formFields.map((field) => ({
        _id: field._id,
        label: field.label,
        fieldType: field.fieldType,
        required: field.required,
        options: [...field.options],
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
    await requireAssetExists(ctx, args.assetId);

    const records = (await ctx.db
      .query("serviceRecords")
      .withIndex("by_assetId_and_completedAt", (q) =>
        q.eq("assetId", args.assetId),
      )
      .order("desc")
      .collect()) as ServiceRecordRow[];

    const groupIds = Array.from(
      new Set(
        records
          .map((record) => record.serviceGroupId)
          .filter((value): value is Id<"serviceGroups"> => value !== null),
      ),
    );
    const providerIds = Array.from(
      new Set(
        records
          .map((record) => record.providerId ?? null)
          .filter((value): value is Id<"serviceProviders"> => value !== null),
      ),
    );
    const userIds = Array.from(
      new Set(records.map((record) => record.completedBy)),
    );

    const [groups, groupFields, providers, users] = await Promise.all([
      Promise.all(groupIds.map((groupId) => ctx.db.get(groupId))),
      Promise.all(groupIds.map((groupId) => listFieldsForGroup(ctx, groupId))),
      Promise.all(providerIds.map((providerId) => ctx.db.get(providerId))),
      Promise.all(userIds.map((userId) => ctx.db.get(userId))),
    ]);

    const groupById = new Map<Id<"serviceGroups">, ServiceGroupRow>();
    for (const group of groups) {
      if (group) {
        groupById.set(group._id, {
          _id: group._id,
          name: group.name,
        });
      }
    }
    const fieldsByGroupId = new Map<
      Id<"serviceGroups">,
      RecordFieldDefinition[]
    >();
    groupIds.forEach((groupId, index) => {
      fieldsByGroupId.set(
        groupId,
        mapServiceGroupFieldRows(groupFields[index] ?? []),
      );
    });
    const providerById = new Map<Id<"serviceProviders">, ServiceProviderRow>();
    for (const provider of providers) {
      if (provider) {
        providerById.set(provider._id, {
          _id: provider._id,
          name: provider.name,
        });
      }
    }
    const userById = new Map<Id<"users">, UserSummary>();
    for (const user of users) {
      if (user) {
        userById.set(user._id, {
          _id: user._id,
          name: user.name,
          email: user.email,
        });
      }
    }

    return records
      .sort((left, right) => {
        const leftDate =
          left.serviceDate ?? timestampToIsoDate(left.completedAt);
        const rightDate =
          right.serviceDate ?? timestampToIsoDate(right.completedAt);
        if (leftDate === rightDate) {
          return right.completedAt - left.completedAt;
        }
        return rightDate.localeCompare(leftDate);
      })
      .map((record) => {
        const serviceDate =
          record.serviceDate ?? timestampToIsoDate(record.completedAt);
        const serviceGroupName =
          record.serviceGroupNameSnapshot ??
          (record.serviceGroupId
            ? (groupById.get(record.serviceGroupId)?.name ?? null)
            : null);
        const provider = record.providerId
          ? providerById.get(record.providerId)
          : null;
        const completedBy = userById.get(record.completedBy);
        const fields =
          getRecordSnapshotFields(record) ??
          (record.serviceGroupId
            ? (fieldsByGroupId.get(record.serviceGroupId) ?? [])
            : []);

        return {
          _id: record._id,
          _creationTime: record._creationTime,
          assetId: record.assetId,
          serviceGroupId: record.serviceGroupId,
          serviceGroupName,
          values: record.values,
          valueEntries: buildValueEntries({ record, fields }),
          scheduleId: record.scheduleId,
          scheduledForDate: record.scheduledForDate,
          serviceDate,
          description: record.description ?? "",
          cost: record.cost ?? null,
          providerId: record.providerId ?? null,
          providerName: provider?.name ?? null,
          completedAt: record.completedAt,
          completedBy: record.completedBy,
          completedByName:
            completedBy?.name ?? completedBy?.email ?? "Unknown user",
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      });
  },
});

export const createRecord = mutation({
  args: {
    assetId: v.id("assets"),
    serviceDate: v.string(),
    description: v.string(),
    cost: v.optional(v.union(v.number(), v.null())),
    providerId: v.optional(v.union(v.id("serviceProviders"), v.null())),
    values: v.optional(recordValuesValidator),
  },
  returns: v.object({
    recordId: v.id("serviceRecords"),
    nextServiceDate: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    const asset = await requireAssetExists(ctx, args.assetId);
    const schedule = await getScheduleForAsset(ctx, asset._id);

    const groupContext = await getRecordGroupContext(
      ctx,
      asset.serviceGroupId ?? null,
    );
    const recordFields = mapServiceGroupFieldRows(groupContext.fields);
    if (args.providerId) {
      await requireProvider(ctx, args.providerId);
    }

    const serviceDate = requireServiceDate(args.serviceDate);
    const now = Date.now();
    const recordId = await ctx.db.insert("serviceRecords", {
      assetId: asset._id,
      serviceGroupId: groupContext.group?._id ?? null,
      serviceGroupNameSnapshot: groupContext.group?.name ?? null,
      values: normalizeRecordValuesForGroup({
        fields: recordFields,
        values: args.values,
      }),
      fieldSnapshots: snapshotRecordFields(recordFields),
      scheduleId: null,
      scheduledForDate: null,
      serviceDate,
      description: requireServiceDescription(args.description),
      cost: normalizeServiceCost(args.cost),
      providerId: args.providerId ?? null,
      completedAt: now,
      completedBy: actor._id as Id<"users">,
      createdAt: now,
      updatedAt: now,
    });

    if (!schedule) {
      return { recordId, nextServiceDate: null };
    }

    const nextServiceDate = getAdvancedNextServiceDate({
      schedule,
      serviceDate,
    });

    await ctx.db.patch(schedule._id, {
      nextServiceDate,
      updatedAt: now,
      updatedBy: actor._id as Id<"users">,
    });

    return { recordId, nextServiceDate };
  },
});

export const updateRecord = mutation({
  args: {
    recordId: v.id("serviceRecords"),
    serviceDate: v.string(),
    description: v.string(),
    cost: v.optional(v.union(v.number(), v.null())),
    providerId: v.optional(v.union(v.id("serviceProviders"), v.null())),
    values: v.optional(recordValuesValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    const record = await requireRecord(ctx, args.recordId);
    ensureRecordAccess(actor, record);

    const snapshotFields = getRecordSnapshotFields(record);
    const groupContext = snapshotFields
      ? null
      : await getRecordGroupContext(ctx, record.serviceGroupId);
    const recordFields =
      snapshotFields ?? mapServiceGroupFieldRows(groupContext?.fields ?? []);
    if (args.providerId) {
      await requireProvider(ctx, args.providerId);
    }

    await ctx.db.patch(record._id, {
      values: normalizeRecordValuesForGroup({
        fields: recordFields,
        values: args.values,
      }),
      fieldSnapshots: snapshotRecordFields(recordFields),
      serviceGroupNameSnapshot:
        record.serviceGroupNameSnapshot ?? groupContext?.group?.name ?? null,
      serviceDate: requireServiceDate(args.serviceDate),
      description: requireServiceDescription(args.description),
      cost: normalizeServiceCost(args.cost),
      providerId: args.providerId ?? null,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteRecord = mutation({
  args: {
    recordId: v.id("serviceRecords"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    const record = await requireRecord(ctx, args.recordId);
    ensureRecordAccess(actor, record);

    const attachments = await ctx.db
      .query("serviceRecordAttachments")
      .withIndex("by_serviceRecordId", (q) =>
        q.eq("serviceRecordId", record._id),
      )
      .collect();

    await Promise.all(
      attachments.map(async (attachment) => {
        await ctx.db.delete(attachment._id);
        try {
          await ctx.storage.delete(
            (attachment as { storageId: Id<"_storage"> }).storageId,
          );
        } catch {
          // best-effort cleanup
        }
      }),
    );

    await ctx.db.delete(record._id);
    return null;
  },
});

export const completeScheduledService = mutation({
  args: {
    scheduleId: v.id("serviceSchedules"),
    serviceDate: v.string(),
    description: v.string(),
    cost: v.optional(v.union(v.number(), v.null())),
    providerId: v.optional(v.union(v.id("serviceProviders"), v.null())),
    values: v.optional(recordValuesValidator),
  },
  returns: v.object({
    recordId: v.id("serviceRecords"),
    nextServiceDate: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await requireAuthenticatedUser(ctx);
    const schedule = await requireSchedule(ctx, args.scheduleId);
    const asset = await requireAssetExists(ctx, schedule.assetId);
    const groupContext = await getRecordGroupContext(
      ctx,
      asset.serviceGroupId ?? null,
    );
    const recordFields = mapServiceGroupFieldRows(groupContext.fields);
    if (args.providerId) {
      await requireProvider(ctx, args.providerId);
    }

    const serviceDate = requireServiceDate(args.serviceDate);
    const now = Date.now();
    const nextServiceDate = getAdvancedNextServiceDate({
      schedule,
      serviceDate,
    });

    const recordId = await ctx.db.insert("serviceRecords", {
      assetId: asset._id,
      serviceGroupId: groupContext.group?._id ?? null,
      serviceGroupNameSnapshot: groupContext.group?.name ?? null,
      values: normalizeRecordValuesForGroup({
        fields: recordFields,
        values: args.values,
      }),
      fieldSnapshots: snapshotRecordFields(recordFields),
      scheduleId: schedule._id,
      scheduledForDate: schedule.nextServiceDate,
      serviceDate,
      description: requireServiceDescription(args.description),
      cost: normalizeServiceCost(args.cost),
      providerId: args.providerId ?? null,
      completedAt: now,
      completedBy: actor._id as Id<"users">,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(schedule._id, {
      nextServiceDate,
      updatedAt: now,
      updatedBy: actor._id as Id<"users">,
    });

    return { recordId, nextServiceDate };
  },
});
