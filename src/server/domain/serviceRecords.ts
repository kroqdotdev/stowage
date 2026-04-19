import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  normalizeServiceRecordValues,
  type ServiceGroupFieldType,
} from "@/server/pb/service-catalog";
import {
  addIntervalToIsoDate,
  normalizeServiceIntervalUnit,
  requireIsoDate,
  type ServiceIntervalUnit,
} from "@/server/pb/service-schedule";

type RecordValue = string | number | boolean | null;

const recordValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const valuesSchema = z.record(z.string(), recordValueSchema);

export const CreateRecordInput = z.object({
  assetId: z.string(),
  serviceDate: z.string(),
  description: z.string(),
  cost: z.number().nullish(),
  providerId: z.string().nullish(),
  values: valuesSchema.optional(),
  actorId: z.string(),
});

export const UpdateRecordInput = z.object({
  recordId: z.string(),
  serviceDate: z.string(),
  description: z.string(),
  cost: z.number().nullish(),
  providerId: z.string().nullish(),
  values: valuesSchema.optional(),
  actorId: z.string(),
  actorRole: z.enum(["admin", "user"]).default("user"),
});

export const CompleteScheduledServiceInput = z.object({
  scheduleId: z.string(),
  serviceDate: z.string(),
  description: z.string(),
  cost: z.number().nullish(),
  providerId: z.string().nullish(),
  values: valuesSchema.optional(),
  actorId: z.string(),
});

export type CreateRecordInput = z.infer<typeof CreateRecordInput>;
export type UpdateRecordInput = z.infer<typeof UpdateRecordInput>;
export type CompleteScheduledServiceInput = z.infer<
  typeof CompleteScheduledServiceInput
>;

export type RecordFieldDefinition = {
  id: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
};

export type RecordFormDefinition = {
  assetId: string;
  assetName: string;
  assetTag: string;
  serviceGroupId: string | null;
  serviceGroupName: string | null;
  scheduleId: string | null;
  nextServiceDate: string | null;
  fields: RecordFieldDefinition[];
};

export type RecordValueEntry = {
  fieldId: string;
  label: string;
  value: RecordValue;
};

export type ServiceRecordView = {
  id: string;
  assetId: string;
  serviceGroupId: string | null;
  serviceGroupName: string | null;
  values: Record<string, RecordValue>;
  valueEntries: RecordValueEntry[];
  scheduleId: string | null;
  scheduledForDate: string | null;
  serviceDate: string;
  description: string;
  cost: number | null;
  providerId: string | null;
  providerName: string | null;
  completedAt: number;
  completedBy: string;
  completedByName: string;
  createdAt: number;
  updatedAt: number;
};

type StoredFieldSnapshot = {
  fieldId: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
};

type AssetRow = {
  id: string;
  name: string;
  assetTag: string;
  serviceGroupId?: string;
};

type ServiceGroupRow = { id: string; name: string };

type ServiceGroupFieldRow = {
  id: string;
  groupId: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
};

type ServiceScheduleRow = {
  id: string;
  assetId: string;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
};

type ServiceRecordRow = {
  id: string;
  assetId: string;
  serviceGroupId: string;
  serviceGroupNameSnapshot: string;
  values: Record<string, RecordValue> | null;
  fieldSnapshots: StoredFieldSnapshot[] | null;
  scheduleId: string;
  scheduledForDate: string;
  serviceDate: string;
  description: string;
  cost?: number | null;
  providerId?: string;
  completedAt: number;
  completedBy: string;
  createdAt: number;
  updatedAt: number;
};

type UserRow = { id: string; name: string; email: string };

type ServiceProviderRow = { id: string; name: string };

function escapeFilter(value: string) {
  return value.replace(/"/g, '\\"');
}

function timestampToIsoDate(ms: number) {
  const date = new Date(ms);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function requireServiceDate(value: string) {
  const serviceDate = requireIsoDate(value);
  const today = timestampToIsoDate(Date.now());
  if (serviceDate > today) {
    throw new ValidationError("Service date cannot be in the future");
  }
  return serviceDate;
}

function requireServiceDescription(value: string) {
  const description = value.trim();
  if (!description) {
    throw new ValidationError("Description is required");
  }
  return description;
}

function normalizeServiceCost(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError("Cost must be a positive number");
  }
  return value;
}

async function requireAsset(ctx: Ctx, assetId: string): Promise<AssetRow> {
  try {
    return await ctx.pb.collection("assets").getOne<AssetRow>(assetId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Asset not found");
    }
    throw error;
  }
}

async function requireRecord(
  ctx: Ctx,
  recordId: string,
): Promise<ServiceRecordRow> {
  try {
    return await ctx.pb
      .collection("serviceRecords")
      .getOne<ServiceRecordRow>(recordId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Service record not found");
    }
    throw error;
  }
}

async function requireSchedule(
  ctx: Ctx,
  scheduleId: string,
): Promise<ServiceScheduleRow> {
  try {
    return await ctx.pb
      .collection("serviceSchedules")
      .getOne<ServiceScheduleRow>(scheduleId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Schedule not found");
    }
    throw error;
  }
}

async function requireProvider(
  ctx: Ctx,
  providerId: string,
): Promise<void> {
  try {
    await ctx.pb.collection("serviceProviders").getOne(providerId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new ValidationError("Service provider not found");
    }
    throw error;
  }
}

async function getScheduleForAsset(
  ctx: Ctx,
  assetId: string,
): Promise<ServiceScheduleRow | null> {
  try {
    return await ctx.pb
      .collection("serviceSchedules")
      .getFirstListItem<ServiceScheduleRow>(
        `assetId = "${escapeFilter(assetId)}"`,
      );
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function getGroup(
  ctx: Ctx,
  groupId: string | null,
): Promise<ServiceGroupRow | null> {
  if (!groupId) return null;
  try {
    return await ctx.pb
      .collection("serviceGroups")
      .getOne<ServiceGroupRow>(groupId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function listFieldsForGroup(
  ctx: Ctx,
  groupId: string,
): Promise<ServiceGroupFieldRow[]> {
  return ctx.pb
    .collection("serviceGroupFields")
    .getFullList<ServiceGroupFieldRow>({
      filter: `groupId = "${escapeFilter(groupId)}"`,
      sort: "sortOrder",
    });
}

function toFieldDefinition(
  field: ServiceGroupFieldRow,
): RecordFieldDefinition {
  return {
    id: field.id,
    label: field.label,
    fieldType: field.fieldType,
    required: !!field.required,
    options: Array.isArray(field.options) ? field.options : [],
    sortOrder: field.sortOrder,
  };
}

function snapshotsToDefinitions(
  snapshots: StoredFieldSnapshot[],
): RecordFieldDefinition[] {
  return snapshots.map((snapshot) => ({
    id: snapshot.fieldId,
    label: snapshot.label,
    fieldType: snapshot.fieldType,
    required: !!snapshot.required,
    options: Array.isArray(snapshot.options) ? snapshot.options : [],
    sortOrder: snapshot.sortOrder,
  }));
}

function definitionsToSnapshots(
  definitions: RecordFieldDefinition[],
): StoredFieldSnapshot[] {
  return definitions.map((definition) => ({
    fieldId: definition.id,
    label: definition.label,
    fieldType: definition.fieldType,
    required: definition.required,
    options: [...definition.options],
    sortOrder: definition.sortOrder,
  }));
}

function normalizeForGroup({
  fields,
  values,
}: {
  fields: RecordFieldDefinition[];
  values: Record<string, RecordValue> | undefined;
}): Record<string, RecordValue> {
  if (fields.length === 0) {
    if (values && Object.keys(values).length > 0) {
      throw new ValidationError(
        "This asset does not require configurable service fields",
      );
    }
    return {};
  }
  return normalizeServiceRecordValues({
    fields: fields.map((f) => ({
      _id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      required: f.required,
      options: f.options,
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
}): RecordValueEntry[] {
  const values = record.values ?? {};
  const fieldIdSet = new Set(fields.map((f) => f.id));
  const labelById = new Map(fields.map((f) => [f.id, f.label]));

  const ordered = fields
    .filter((f) => Object.prototype.hasOwnProperty.call(values, f.id))
    .map((field) => ({
      fieldId: field.id,
      label: field.label,
      value: values[field.id] ?? null,
    }));

  const unknown = Object.entries(values)
    .filter(([fieldId]) => !fieldIdSet.has(fieldId))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fieldId, value]) => ({
      fieldId,
      label: labelById.get(fieldId) ?? fieldId,
      value,
    }));

  return [...ordered, ...unknown];
}

export async function getRecordFormDefinition(
  ctx: Ctx,
  args: { assetId: string; recordId?: string },
): Promise<RecordFormDefinition> {
  const asset = await requireAsset(ctx, args.assetId);
  const record = args.recordId ? await requireRecord(ctx, args.recordId) : null;
  if (record && record.assetId !== asset.id) {
    throw new NotFoundError("Service record does not belong to this asset");
  }
  const schedule = await getScheduleForAsset(ctx, asset.id);

  let fields: RecordFieldDefinition[];
  let groupId: string | null = null;
  let groupName: string | null = null;

  if (record) {
    groupId = record.serviceGroupId || null;
    if (record.fieldSnapshots && record.fieldSnapshots.length > 0) {
      fields = snapshotsToDefinitions(record.fieldSnapshots);
      groupName = record.serviceGroupNameSnapshot || null;
    } else if (groupId) {
      const [group, groupFields] = await Promise.all([
        getGroup(ctx, groupId),
        listFieldsForGroup(ctx, groupId),
      ]);
      groupName = group?.name ?? null;
      fields = groupFields.map(toFieldDefinition);
    } else {
      fields = [];
    }
  } else {
    groupId = asset.serviceGroupId || null;
    if (groupId) {
      const [group, groupFields] = await Promise.all([
        getGroup(ctx, groupId),
        listFieldsForGroup(ctx, groupId),
      ]);
      groupName = group?.name ?? null;
      fields = groupFields.map(toFieldDefinition);
    } else {
      fields = [];
    }
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    assetTag: asset.assetTag,
    serviceGroupId: groupId,
    serviceGroupName: groupName,
    scheduleId: schedule?.id ?? null,
    nextServiceDate: schedule?.nextServiceDate ?? null,
    fields,
  };
}

export async function listAssetRecords(
  ctx: Ctx,
  assetId: string,
): Promise<ServiceRecordView[]> {
  await requireAsset(ctx, assetId);
  const records = await ctx.pb
    .collection("serviceRecords")
    .getFullList<ServiceRecordRow>({
      filter: `assetId = "${escapeFilter(assetId)}"`,
      sort: "-completedAt",
    });

  const groupIds = [
    ...new Set(records.map((r) => r.serviceGroupId).filter((id) => !!id)),
  ];
  const providerIds = [
    ...new Set(records.map((r) => r.providerId).filter((id): id is string => !!id)),
  ];
  const userIds = [...new Set(records.map((r) => r.completedBy))];

  const [groups, groupFields, providers, users] = await Promise.all([
    Promise.all(
      groupIds.map((id) =>
        ctx.pb
          .collection("serviceGroups")
          .getOne<ServiceGroupRow>(id)
          .catch(() => null),
      ),
    ),
    Promise.all(
      groupIds.map((id) => listFieldsForGroup(ctx, id).catch(() => [])),
    ),
    Promise.all(
      providerIds.map((id) =>
        ctx.pb
          .collection("serviceProviders")
          .getOne<ServiceProviderRow>(id)
          .catch(() => null),
      ),
    ),
    Promise.all(
      userIds.map((id) =>
        ctx.pb
          .collection("users")
          .getOne<UserRow>(id)
          .catch(() => null),
      ),
    ),
  ]);

  const groupById = new Map(
    (groups.filter(Boolean) as ServiceGroupRow[]).map((g) => [g.id, g]),
  );
  const fieldsByGroupId = new Map<string, RecordFieldDefinition[]>();
  groupIds.forEach((id, index) => {
    fieldsByGroupId.set(id, (groupFields[index] ?? []).map(toFieldDefinition));
  });
  const providerById = new Map(
    (providers.filter(Boolean) as ServiceProviderRow[]).map((p) => [p.id, p]),
  );
  const userById = new Map(
    (users.filter(Boolean) as UserRow[]).map((u) => [u.id, u]),
  );

  return records
    .sort((left, right) => {
      const leftDate =
        left.serviceDate || timestampToIsoDate(left.completedAt);
      const rightDate =
        right.serviceDate || timestampToIsoDate(right.completedAt);
      if (leftDate === rightDate) {
        return right.completedAt - left.completedAt;
      }
      return rightDate.localeCompare(leftDate);
    })
    .map((record) => {
      const serviceDate =
        record.serviceDate || timestampToIsoDate(record.completedAt);
      const groupName =
        record.serviceGroupNameSnapshot ||
        (record.serviceGroupId
          ? (groupById.get(record.serviceGroupId)?.name ?? null)
          : null);
      const fields =
        record.fieldSnapshots && record.fieldSnapshots.length > 0
          ? snapshotsToDefinitions(record.fieldSnapshots)
          : (record.serviceGroupId
              ? (fieldsByGroupId.get(record.serviceGroupId) ?? [])
              : []);
      const completedBy = userById.get(record.completedBy);
      return {
        id: record.id,
        assetId: record.assetId,
        serviceGroupId: record.serviceGroupId || null,
        serviceGroupName: groupName,
        values: record.values ?? {},
        valueEntries: buildValueEntries({ record, fields }),
        scheduleId: record.scheduleId || null,
        scheduledForDate: record.scheduledForDate || null,
        serviceDate,
        description: record.description ?? "",
        cost: record.cost ?? null,
        providerId: record.providerId || null,
        providerName: record.providerId
          ? (providerById.get(record.providerId)?.name ?? null)
          : null,
        completedAt: record.completedAt,
        completedBy: record.completedBy,
        completedByName:
          completedBy?.name ?? completedBy?.email ?? "Unknown user",
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
}

async function loadGroupContext(
  ctx: Ctx,
  groupId: string | null,
): Promise<{
  group: ServiceGroupRow | null;
  fields: RecordFieldDefinition[];
}> {
  if (!groupId) return { group: null, fields: [] };
  const [group, groupFields] = await Promise.all([
    getGroup(ctx, groupId),
    listFieldsForGroup(ctx, groupId),
  ]);
  if (!group) {
    throw new NotFoundError("Service group not found");
  }
  return { group, fields: groupFields.map(toFieldDefinition) };
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

export async function createRecord(
  ctx: Ctx,
  input: CreateRecordInput,
): Promise<{ recordId: string; nextServiceDate: string | null }> {
  const parsed = CreateRecordInput.parse(input);
  const asset = await requireAsset(ctx, parsed.assetId);
  const schedule = await getScheduleForAsset(ctx, asset.id);
  const groupContext = await loadGroupContext(
    ctx,
    asset.serviceGroupId || null,
  );
  if (parsed.providerId) await requireProvider(ctx, parsed.providerId);

  const serviceDate = requireServiceDate(parsed.serviceDate);
  const description = requireServiceDescription(parsed.description);
  const cost = normalizeServiceCost(parsed.cost);
  const values = normalizeForGroup({
    fields: groupContext.fields,
    values: parsed.values,
  });

  const now = Date.now();
  const record = await ctx.pb.collection("serviceRecords").create<ServiceRecordRow>({
    assetId: asset.id,
    serviceGroupId: groupContext.group?.id ?? "",
    serviceGroupNameSnapshot: groupContext.group?.name ?? "",
    values,
    fieldSnapshots: definitionsToSnapshots(groupContext.fields),
    scheduleId: "",
    scheduledForDate: "",
    serviceDate,
    description,
    cost,
    providerId: parsed.providerId ?? undefined,
    completedAt: now,
    completedBy: parsed.actorId,
    createdAt: now,
    updatedAt: now,
  });

  if (!schedule) {
    return { recordId: record.id, nextServiceDate: null };
  }

  const nextServiceDate = getAdvancedNextServiceDate({
    schedule,
    serviceDate,
  });
  await ctx.pb.collection("serviceSchedules").update(schedule.id, {
    nextServiceDate,
    updatedAt: now,
    updatedBy: parsed.actorId,
  });

  return { recordId: record.id, nextServiceDate };
}

export async function updateRecord(
  ctx: Ctx,
  input: UpdateRecordInput,
): Promise<void> {
  const parsed = UpdateRecordInput.parse(input);
  const record = await requireRecord(ctx, parsed.recordId);

  if (parsed.actorRole !== "admin" && record.completedBy !== parsed.actorId) {
    throw new ValidationError(
      "You do not have access to modify this service record",
    );
  }

  const fields =
    record.fieldSnapshots && record.fieldSnapshots.length > 0
      ? snapshotsToDefinitions(record.fieldSnapshots)
      : record.serviceGroupId
        ? (await listFieldsForGroup(ctx, record.serviceGroupId)).map(
            toFieldDefinition,
          )
        : [];
  if (parsed.providerId) await requireProvider(ctx, parsed.providerId);

  const serviceDate = requireServiceDate(parsed.serviceDate);
  const description = requireServiceDescription(parsed.description);
  const cost = normalizeServiceCost(parsed.cost);
  const values = normalizeForGroup({ fields, values: parsed.values });

  await ctx.pb.collection("serviceRecords").update(record.id, {
    values,
    fieldSnapshots: definitionsToSnapshots(fields),
    serviceDate,
    description,
    cost,
    providerId: parsed.providerId ?? undefined,
    updatedAt: Date.now(),
  });
}

export async function deleteRecord(
  ctx: Ctx,
  recordId: string,
  actor: { id: string; role: "admin" | "user" },
): Promise<void> {
  const record = await requireRecord(ctx, recordId);
  if (actor.role !== "admin" && record.completedBy !== actor.id) {
    throw new ValidationError(
      "You do not have access to modify this service record",
    );
  }

  const attachments = await ctx.pb
    .collection("serviceRecordAttachments")
    .getFullList<{ id: string }>({
      filter: `serviceRecordId = "${escapeFilter(record.id)}"`,
    });
  for (const attachment of attachments) {
    await ctx.pb.collection("serviceRecordAttachments").delete(attachment.id);
  }
  await ctx.pb.collection("serviceRecords").delete(record.id);
}

export async function completeScheduledService(
  ctx: Ctx,
  input: CompleteScheduledServiceInput,
): Promise<{ recordId: string; nextServiceDate: string }> {
  const parsed = CompleteScheduledServiceInput.parse(input);
  const schedule = await requireSchedule(ctx, parsed.scheduleId);
  const asset = await requireAsset(ctx, schedule.assetId);
  const groupContext = await loadGroupContext(
    ctx,
    asset.serviceGroupId || null,
  );
  if (parsed.providerId) await requireProvider(ctx, parsed.providerId);

  const serviceDate = requireServiceDate(parsed.serviceDate);
  const description = requireServiceDescription(parsed.description);
  const cost = normalizeServiceCost(parsed.cost);
  const values = normalizeForGroup({
    fields: groupContext.fields,
    values: parsed.values,
  });

  const now = Date.now();
  const nextServiceDate = getAdvancedNextServiceDate({
    schedule,
    serviceDate,
  });

  const record = await ctx.pb.collection("serviceRecords").create<ServiceRecordRow>({
    assetId: asset.id,
    serviceGroupId: groupContext.group?.id ?? "",
    serviceGroupNameSnapshot: groupContext.group?.name ?? "",
    values,
    fieldSnapshots: definitionsToSnapshots(groupContext.fields),
    scheduleId: schedule.id,
    scheduledForDate: schedule.nextServiceDate,
    serviceDate,
    description,
    cost,
    providerId: parsed.providerId ?? undefined,
    completedAt: now,
    completedBy: parsed.actorId,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.pb.collection("serviceSchedules").update(schedule.id, {
    nextServiceDate,
    updatedAt: now,
    updatedBy: parsed.actorId,
  });

  return { recordId: record.id, nextServiceDate };
}
