import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireAdminUser, requireAuthenticatedUser } from "./authz";
import { type AppDateFormat } from "./custom_fields_helpers";

const dateFormatValidator = v.union(
  v.literal("DD-MM-YYYY"),
  v.literal("MM-DD-YYYY"),
  v.literal("YYYY-MM-DD"),
);

const appSettingsViewValidator = v.object({
  dateFormat: dateFormatValidator,
  serviceSchedulingEnabled: v.boolean(),
  updatedAt: v.union(v.number(), v.null()),
});

type AppSettingsRow = {
  _id: Id<"appSettings">;
  key: "global";
  dateFormat: AppDateFormat;
  serviceSchedulingEnabled?: boolean;
  updatedAt: number;
  updatedBy: Id<"users">;
};

const DEFAULT_DATE_FORMAT: AppDateFormat = "DD-MM-YYYY";
const DEFAULT_SERVICE_SCHEDULING_ENABLED = true;

function toAppSettingsView(row: AppSettingsRow | null) {
  if (!row) {
    return {
      dateFormat: DEFAULT_DATE_FORMAT,
      serviceSchedulingEnabled: DEFAULT_SERVICE_SCHEDULING_ENABLED,
      updatedAt: null,
    };
  }

  return {
    dateFormat: row.dateFormat,
    serviceSchedulingEnabled:
      row.serviceSchedulingEnabled ?? DEFAULT_SERVICE_SCHEDULING_ENABLED,
    updatedAt: row.updatedAt,
  };
}

export const getAppSettings = query({
  args: {},
  returns: appSettingsViewValidator,
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const row = (await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first()) as AppSettingsRow | null;

    return toAppSettingsView(row);
  },
});

export const updateDateFormat = mutation({
  args: { dateFormat: dateFormatValidator },
  returns: appSettingsViewValidator,
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);
    const dateFormat = args.dateFormat;

    const existing = (await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first()) as AppSettingsRow | null;

    const now = Date.now();
    const serviceSchedulingEnabled =
      existing?.serviceSchedulingEnabled ?? DEFAULT_SERVICE_SCHEDULING_ENABLED;

    if (existing) {
      await ctx.db.patch(existing._id, {
        dateFormat,
        serviceSchedulingEnabled,
        updatedAt: now,
        updatedBy: actor._id as Id<"users">,
      });
    } else {
      await ctx.db.insert("appSettings", {
        key: "global",
        dateFormat,
        serviceSchedulingEnabled,
        updatedAt: now,
        updatedBy: actor._id as Id<"users">,
      });
    }

    return {
      dateFormat,
      serviceSchedulingEnabled,
      updatedAt: now,
    };
  },
});

export const updateServiceSchedulingEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: appSettingsViewValidator,
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx);

    const existing = (await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first()) as AppSettingsRow | null;

    const dateFormat = existing?.dateFormat ?? DEFAULT_DATE_FORMAT;
    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dateFormat,
        serviceSchedulingEnabled: args.enabled,
        updatedAt: now,
        updatedBy: actor._id as Id<"users">,
      });
    } else {
      await ctx.db.insert("appSettings", {
        key: "global",
        dateFormat,
        serviceSchedulingEnabled: args.enabled,
        updatedAt: now,
        updatedBy: actor._id as Id<"users">,
      });
    }

    return {
      dateFormat,
      serviceSchedulingEnabled: args.enabled,
      updatedAt: now,
    };
  },
});
