import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAdminUser, requireAuthenticatedUser } from "./authz"
import { type AppDateFormat } from "./custom_fields_helpers"

const dateFormatValidator = v.union(
  v.literal("DD-MM-YYYY"),
  v.literal("MM-DD-YYYY"),
  v.literal("YYYY-MM-DD"),
)

const appSettingsViewValidator = v.object({
  dateFormat: dateFormatValidator,
  updatedAt: v.union(v.number(), v.null()),
})

type AppSettingsRow = {
  _id: string
  key: "global"
  dateFormat: AppDateFormat
  updatedAt: number
  updatedBy: string
}

const DEFAULT_DATE_FORMAT: AppDateFormat = "DD-MM-YYYY"

export const getAppSettings = query({
  args: {},
  returns: appSettingsViewValidator,
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx)

    const row = (await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first()) as AppSettingsRow | null

    if (!row) {
      return {
        dateFormat: DEFAULT_DATE_FORMAT,
        updatedAt: null,
      }
    }

    return {
      dateFormat: row.dateFormat,
      updatedAt: row.updatedAt,
    }
  },
})

export const updateDateFormat = mutation({
  args: { dateFormat: dateFormatValidator },
  returns: appSettingsViewValidator,
  handler: async (ctx, args) => {
    const actor = await requireAdminUser(ctx)
    const dateFormat = args.dateFormat

    const existing = (await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first()) as AppSettingsRow | null

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id as never, {
        dateFormat,
        updatedAt: now,
        updatedBy: actor._id as never,
      })
    } else {
      await ctx.db.insert("appSettings", {
        key: "global",
        dateFormat,
        updatedAt: now,
        updatedBy: actor._id as never,
      })
    }

    return {
      dateFormat,
      updatedAt: now,
    }
  },
})
