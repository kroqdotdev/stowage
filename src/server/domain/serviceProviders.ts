import { ClientResponseError } from "pocketbase";
import { z } from "zod";

import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  normalizeOptionalServiceText,
  normalizeServiceName,
  normalizeServiceNameKey,
} from "@/server/pb/service-catalog";

export const CreateProviderInput = z.object({
  name: z.string(),
  contactEmail: z.string().nullish(),
  contactPhone: z.string().nullish(),
  notes: z.string().nullish(),
  actorId: z.string(),
});

export const UpdateProviderInput = CreateProviderInput.extend({
  providerId: z.string(),
});

export type CreateProviderInput = z.infer<typeof CreateProviderInput>;
export type UpdateProviderInput = z.infer<typeof UpdateProviderInput>;

export type ProviderView = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type ProviderOption = {
  id: string;
  name: string;
};

type ProviderRecord = {
  id: string;
  name: string;
  normalizedName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

function toView(record: ProviderRecord): ProviderView {
  return {
    id: record.id,
    name: record.name,
    contactEmail: record.contactEmail || null,
    contactPhone: record.contactPhone || null,
    notes: record.notes || null,
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

async function assertUniqueName(
  ctx: Ctx,
  normalizedName: string,
  excludeId?: string,
) {
  const matches = await ctx.pb
    .collection("serviceProviders")
    .getList<ProviderRecord>(1, 2, {
      filter: `normalizedName = "${normalizedName.replace(/"/g, '\\"')}"`,
    });
  const duplicate = matches.items.find((row) => row.id !== excludeId);
  if (duplicate) {
    throw new ConflictError("A service provider with this name already exists");
  }
}

async function loadProvider(
  ctx: Ctx,
  providerId: string,
): Promise<ProviderRecord> {
  try {
    return await ctx.pb
      .collection("serviceProviders")
      .getOne<ProviderRecord>(providerId);
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) {
      throw new NotFoundError("Service provider not found");
    }
    throw error;
  }
}

export async function listProviders(ctx: Ctx): Promise<ProviderView[]> {
  const records = await ctx.pb
    .collection("serviceProviders")
    .getFullList<ProviderRecord>();
  return sortByName(records).map(toView);
}

export async function listProviderOptions(ctx: Ctx): Promise<ProviderOption[]> {
  const records = await ctx.pb
    .collection("serviceProviders")
    .getFullList<ProviderRecord>();
  return sortByName(records).map((row) => ({ id: row.id, name: row.name }));
}

export async function createProvider(
  ctx: Ctx,
  input: CreateProviderInput,
): Promise<ProviderView> {
  const parsed = CreateProviderInput.parse(input);
  const name = normalizeServiceName(parsed.name);
  if (!name) throw new ValidationError("Provider name is required");
  const normalizedName = normalizeServiceNameKey(name);
  await assertUniqueName(ctx, normalizedName);

  const now = Date.now();
  const record = await ctx.pb
    .collection("serviceProviders")
    .create<ProviderRecord>({
      name,
      normalizedName,
      contactEmail: normalizeOptionalServiceText(parsed.contactEmail) ?? "",
      contactPhone: normalizeOptionalServiceText(parsed.contactPhone) ?? "",
      notes: normalizeOptionalServiceText(parsed.notes) ?? "",
      createdAt: now,
      updatedAt: now,
      createdBy: parsed.actorId,
      updatedBy: parsed.actorId,
    });

  return toView(record);
}

export async function updateProvider(
  ctx: Ctx,
  input: UpdateProviderInput,
): Promise<ProviderView> {
  const parsed = UpdateProviderInput.parse(input);
  const existing = await loadProvider(ctx, parsed.providerId);
  const name = normalizeServiceName(parsed.name);
  if (!name) throw new ValidationError("Provider name is required");
  const normalizedName = normalizeServiceNameKey(name);
  await assertUniqueName(ctx, normalizedName, existing.id);

  const record = await ctx.pb
    .collection("serviceProviders")
    .update<ProviderRecord>(existing.id, {
      name,
      normalizedName,
      contactEmail: normalizeOptionalServiceText(parsed.contactEmail) ?? "",
      contactPhone: normalizeOptionalServiceText(parsed.contactPhone) ?? "",
      notes: normalizeOptionalServiceText(parsed.notes) ?? "",
      updatedAt: Date.now(),
      updatedBy: parsed.actorId,
    });

  return toView(record);
}

export async function deleteProvider(
  ctx: Ctx,
  providerId: string,
): Promise<void> {
  const provider = await loadProvider(ctx, providerId);
  const inUse = await ctx.pb
    .collection("serviceRecords")
    .getList(1, 1, { filter: `providerId = "${provider.id}"` });
  if (inUse.totalItems > 0) {
    throw new ConflictError(
      "This service provider is in use and cannot be deleted",
    );
  }
  await ctx.pb.collection("serviceProviders").delete(provider.id);
}
