import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  normalizeServiceName,
  normalizeServiceNameKey,
} from "@/server/pb/service-catalog";

export const CreateGroupInput = z.object({
  name: z.string(),
  description: z.string().nullish(),
  actorId: z.string(),
});

export const UpdateGroupInput = CreateGroupInput.extend({
  groupId: z.string(),
});

export type CreateGroupInput = z.infer<typeof CreateGroupInput>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupInput>;

export type GroupView = {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type GroupSummary = GroupView & {
  assetCount: number;
  fieldCount: number;
};

export type AssignableGroup = { id: string; name: string };

export type GroupAsset = {
  id: string;
  name: string;
  assetTag: string;
  status: string;
};

type GroupRecord = {
  id: string;
  name: string;
  normalizedName: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

function toGroupView(record: GroupRecord): GroupView {
  return {
    id: record.id,
    name: record.name,
    description: record.description || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
  };
}

function sortByName<T extends { name: string }>(rows: T[]) {
  return rows
    .slice()
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

async function assertUniqueGroupName(
  ctx: Ctx,
  normalizedName: string,
  excludeId?: string,
) {
  const matches = await ctx.pb
    .collection("serviceGroups")
    .getList<GroupRecord>(1, 2, {
      filter: `normalizedName = "${normalizedName.replace(/"/g, '\\"')}"`,
    });
  const duplicate = matches.items.find((row) => row.id !== excludeId);
  if (duplicate) {
    throw new ConflictError(
      "A service group with this name already exists",
    );
  }
}

async function loadGroup(ctx: Ctx, groupId: string): Promise<GroupRecord> {
  try {
    return await ctx.pb
      .collection("serviceGroups")
      .getOne<GroupRecord>(groupId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Service group not found");
    }
    throw error;
  }
}

function normalizeGroupDescription(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.length > 2000) {
    throw new ValidationError(
      "Description must be 2000 characters or fewer",
    );
  }
  return trimmed;
}

export async function listGroups(ctx: Ctx): Promise<GroupSummary[]> {
  const records = await ctx.pb
    .collection("serviceGroups")
    .getFullList<GroupRecord>();
  const sorted = sortByName(records);

  const [assetCounts, fieldCounts] = await Promise.all([
    Promise.all(
      sorted.map(async (group) => {
        const result = await ctx.pb
          .collection("assets")
          .getList(1, 1, { filter: `serviceGroupId = "${group.id}"` });
        return result.totalItems;
      }),
    ),
    Promise.all(
      sorted.map(async (group) => {
        const result = await ctx.pb
          .collection("serviceGroupFields")
          .getList(1, 1, { filter: `groupId = "${group.id}"` });
        return result.totalItems;
      }),
    ),
  ]);

  return sorted.map((group, index) => ({
    ...toGroupView(group),
    assetCount: assetCounts[index] ?? 0,
    fieldCount: fieldCounts[index] ?? 0,
  }));
}

export async function listAssignableGroups(
  ctx: Ctx,
): Promise<AssignableGroup[]> {
  const records = await ctx.pb
    .collection("serviceGroups")
    .getFullList<GroupRecord>();
  return sortByName(records).map((row) => ({ id: row.id, name: row.name }));
}

export async function getGroup(
  ctx: Ctx,
  groupId: string,
): Promise<GroupView | null> {
  try {
    const record = await ctx.pb
      .collection("serviceGroups")
      .getOne<GroupRecord>(groupId);
    return toGroupView(record);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createGroup(
  ctx: Ctx,
  input: CreateGroupInput,
): Promise<GroupView> {
  const parsed = CreateGroupInput.parse(input);
  const name = normalizeServiceName(parsed.name);
  if (!name) throw new ValidationError("Group name is required");
  const normalizedName = normalizeServiceNameKey(name);
  await assertUniqueGroupName(ctx, normalizedName);
  const description = normalizeGroupDescription(parsed.description);

  const now = Date.now();
  const record = await ctx.pb
    .collection("serviceGroups")
    .create<GroupRecord>({
      name,
      normalizedName,
      description,
      createdAt: now,
      updatedAt: now,
      createdBy: parsed.actorId,
      updatedBy: parsed.actorId,
    });
  return toGroupView(record);
}

export async function updateGroup(
  ctx: Ctx,
  input: UpdateGroupInput,
): Promise<GroupView> {
  const parsed = UpdateGroupInput.parse(input);
  const existing = await loadGroup(ctx, parsed.groupId);
  const name = normalizeServiceName(parsed.name);
  if (!name) throw new ValidationError("Group name is required");
  const normalizedName = normalizeServiceNameKey(name);
  await assertUniqueGroupName(ctx, normalizedName, existing.id);
  const description = normalizeGroupDescription(parsed.description);

  const record = await ctx.pb
    .collection("serviceGroups")
    .update<GroupRecord>(existing.id, {
      name,
      normalizedName,
      description,
      updatedAt: Date.now(),
      updatedBy: parsed.actorId,
    });
  return toGroupView(record);
}

export async function deleteGroup(ctx: Ctx, groupId: string): Promise<void> {
  const group = await loadGroup(ctx, groupId);

  const [assetUse, recordUse] = await Promise.all([
    ctx.pb
      .collection("assets")
      .getList(1, 1, { filter: `serviceGroupId = "${group.id}"` }),
    ctx.pb
      .collection("serviceRecords")
      .getList(1, 1, { filter: `serviceGroupId = "${group.id}"` }),
  ]);
  if (assetUse.totalItems > 0 || recordUse.totalItems > 0) {
    throw new ConflictError(
      "This service group is in use and cannot be deleted",
    );
  }

  // Fields cascade-delete via the PB relation definition, but do it explicitly
  // in case the cascade behavior changes.
  const fields = await ctx.pb
    .collection("serviceGroupFields")
    .getFullList<{ id: string }>({
      filter: `groupId = "${group.id}"`,
    });
  for (const field of fields) {
    await ctx.pb.collection("serviceGroupFields").delete(field.id);
  }
  await ctx.pb.collection("serviceGroups").delete(group.id);
}

export async function listGroupAssets(
  ctx: Ctx,
  groupId: string,
): Promise<GroupAsset[]> {
  await loadGroup(ctx, groupId);
  const assets = await ctx.pb
    .collection("assets")
    .getFullList<{
      id: string;
      name: string;
      assetTag: string;
      status: string;
    }>({ filter: `serviceGroupId = "${groupId}"` });
  return sortByName(assets).map((asset) => ({
    id: asset.id,
    name: asset.name,
    assetTag: asset.assetTag,
    status: asset.status,
  }));
}
