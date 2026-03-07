import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requireAuthenticatedUser } from "./authz";

const statusCountValidator = v.object({
  active: v.number(),
  in_storage: v.number(),
  under_repair: v.number(),
  retired: v.number(),
  disposed: v.number(),
});

const categoryBreakdownItemValidator = v.object({
  _id: v.id("categories"),
  name: v.string(),
  color: v.string(),
  count: v.number(),
});

const locationBreakdownItemValidator = v.object({
  _id: v.id("locations"),
  name: v.string(),
  count: v.number(),
});

export const getDashboardStats = query({
  args: {},
  returns: v.object({
    totalAssets: v.number(),
    statusCounts: statusCountValidator,
    categoryBreakdown: v.array(categoryBreakdownItemValidator),
    locationBreakdown: v.array(locationBreakdownItemValidator),
  }),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const assets = await ctx.db.query("assets").collect();

    const statusCounts = {
      active: 0,
      in_storage: 0,
      under_repair: 0,
      retired: 0,
      disposed: 0,
    };

    const categoryCountMap = new Map<string, number>();
    const locationCountMap = new Map<string, number>();

    for (const asset of assets) {
      const status = asset.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }

      if (asset.categoryId) {
        const key = String(asset.categoryId);
        categoryCountMap.set(key, (categoryCountMap.get(key) ?? 0) + 1);
      }

      if (asset.locationId) {
        const key = String(asset.locationId);
        locationCountMap.set(key, (locationCountMap.get(key) ?? 0) + 1);
      }
    }

    const categoryIds = Array.from(categoryCountMap.keys());
    const categoryRows = await Promise.all(
      categoryIds.map((id) => ctx.db.get(id as Id<"categories">)),
    );

    const categoryBreakdown = categoryRows
      .filter(Boolean)
      .map((cat) => ({
        _id: cat!._id as Id<"categories">,
        name: String(cat!.name),
        color: String(cat!.color),
        count: categoryCountMap.get(String(cat!._id)) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    const locationIds = Array.from(locationCountMap.keys());
    const locationRows = await Promise.all(
      locationIds.map((id) => ctx.db.get(id as Id<"locations">)),
    );

    const locationBreakdown = locationRows
      .filter(Boolean)
      .map((loc) => ({
        _id: loc!._id as Id<"locations">,
        name: String(loc!.name),
        count: locationCountMap.get(String(loc!._id)) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalAssets: assets.length,
      statusCounts,
      categoryBreakdown,
      locationBreakdown,
    };
  },
});
