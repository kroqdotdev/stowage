import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";
import {
  normalizeOptionalServiceText,
  normalizeServiceName,
  normalizeServiceNameKey,
  throwServiceRecordError,
} from "./service_record_helpers";

const serviceProviderValidator = v.object({
  _id: v.id("serviceProviders"),
  _creationTime: v.number(),
  name: v.string(),
  contactEmail: v.union(v.string(), v.null()),
  contactPhone: v.union(v.string(), v.null()),
  notes: v.union(v.string(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.id("users"),
  updatedBy: v.id("users"),
});

const providerOptionValidator = v.object({
  _id: v.id("serviceProviders"),
  name: v.string(),
});

type ServiceProviderRow = {
  _id: Id<"serviceProviders">;
  _creationTime: number;
  name: string;
  normalizedName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

type ServiceRecordRow = {
  _id: Id<"serviceRecords">;
  providerId?: Id<"serviceProviders"> | null;
};

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

async function requireUniqueProviderName(
  ctx: QueryCtx | MutationCtx,
  name: string,
  existingProviderId?: Id<"serviceProviders">,
) {
  const normalizedName = normalizeServiceNameKey(name);
  const existing = (await ctx.db
    .query("serviceProviders")
    .withIndex("by_normalizedName", (q) =>
      q.eq("normalizedName", normalizedName),
    )
    .first()) as ServiceProviderRow | null;

  if (existing && existing._id !== existingProviderId) {
    throwServiceRecordError(
      "INVALID_FIELD_VALUE",
      "A service provider with this name already exists",
    );
  }

  return normalizedName;
}

export const listProviders = query({
  args: {},
  returns: v.array(serviceProviderValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const providers = (await ctx.db
      .query("serviceProviders")
      .collect()) as ServiceProviderRow[];

    return providers
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map((provider) => ({
        _id: provider._id,
        _creationTime: provider._creationTime,
        name: provider.name,
        contactEmail: provider.contactEmail,
        contactPhone: provider.contactPhone,
        notes: provider.notes,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        createdBy: provider.createdBy,
        updatedBy: provider.updatedBy,
      }));
  },
});

export const listProviderOptions = query({
  args: {},
  returns: v.array(providerOptionValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const providers = (await ctx.db
      .query("serviceProviders")
      .collect()) as ServiceProviderRow[];

    return providers
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map((provider) => ({
        _id: provider._id,
        name: provider.name,
      }));
  },
});

export const createProvider = mutation({
  args: {
    name: v.string(),
    contactEmail: v.optional(v.union(v.string(), v.null())),
    contactPhone: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.object({ providerId: v.id("serviceProviders") }),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const name = normalizeServiceName(args.name);
    if (!name) {
      throwServiceRecordError(
        "INVALID_FIELD_VALUE",
        "Provider name is required",
      );
    }

    const normalizedName = await requireUniqueProviderName(ctx, name);
    const now = Date.now();
    const providerId = await ctx.db.insert("serviceProviders", {
      name,
      normalizedName,
      contactEmail: normalizeOptionalServiceText(args.contactEmail),
      contactPhone: normalizeOptionalServiceText(args.contactPhone),
      notes: normalizeOptionalServiceText(args.notes),
      createdAt: now,
      updatedAt: now,
      createdBy: actor._id as Id<"users">,
      updatedBy: actor._id as Id<"users">,
    });

    return { providerId };
  },
});

export const updateProvider = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    name: v.string(),
    contactEmail: v.optional(v.union(v.string(), v.null())),
    contactPhone: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const provider = await requireProvider(ctx, args.providerId);
    const name = normalizeServiceName(args.name);
    if (!name) {
      throwServiceRecordError(
        "INVALID_FIELD_VALUE",
        "Provider name is required",
      );
    }

    const normalizedName = await requireUniqueProviderName(
      ctx,
      name,
      provider._id,
    );

    await ctx.db.patch(provider._id, {
      name,
      normalizedName,
      contactEmail: normalizeOptionalServiceText(args.contactEmail),
      contactPhone: normalizeOptionalServiceText(args.contactPhone),
      notes: normalizeOptionalServiceText(args.notes),
      updatedAt: Date.now(),
      updatedBy: actor._id as Id<"users">,
    });

    return null;
  },
});

export const deleteProvider = mutation({
  args: {
    providerId: v.id("serviceProviders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const provider = await requireProvider(ctx, args.providerId);

    const inUseRecord = await ctx.db
      .query("serviceRecords")
      .withIndex("by_providerId", (q) => q.eq("providerId", provider._id))
      .first();
    const inUse = inUseRecord !== null;
    if (inUse) {
      throwServiceRecordError(
        "PROVIDER_IN_USE",
        "This service provider is in use and cannot be deleted",
      );
    }

    await ctx.db.delete(provider._id);
    return null;
  },
});
