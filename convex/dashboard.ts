import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireAuthenticatedUser } from "./authz";
import type { AppDateFormat } from "./custom_fields_helpers";

const assetStatusValidator = v.union(
  v.literal("active"),
  v.literal("in_storage"),
  v.literal("under_repair"),
  v.literal("retired"),
  v.literal("disposed"),
);

const dateFormatValidator = v.union(
  v.literal("DD-MM-YYYY"),
  v.literal("MM-DD-YYYY"),
  v.literal("YYYY-MM-DD"),
);

const statusCountsValidator = v.object({
  active: v.number(),
  in_storage: v.number(),
  under_repair: v.number(),
  retired: v.number(),
  disposed: v.number(),
});

const recentAssetValidator = v.object({
  _id: v.id("assets"),
  name: v.string(),
  assetTag: v.string(),
  status: assetStatusValidator,
  updatedAt: v.number(),
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

const upcomingServiceItemValidator = v.object({
  scheduleId: v.id("serviceSchedules"),
  assetId: v.id("assets"),
  assetName: v.string(),
  assetTag: v.string(),
  assetStatus: assetStatusValidator,
  nextServiceDate: v.string(),
});

const upcomingServicesPreviewValidator = v.object({
  serviceSchedulingEnabled: v.boolean(),
  overdueCount: v.number(),
  items: v.array(upcomingServiceItemValidator),
});

const dashboardOverviewValidator = v.object({
  dateFormat: dateFormatValidator,
  totalAssets: v.number(),
  statusCounts: statusCountsValidator,
  recentAssets: v.array(recentAssetValidator),
  categoryBreakdown: v.array(categoryBreakdownItemValidator),
  locationBreakdown: v.array(locationBreakdownItemValidator),
  serviceSchedulingEnabled: v.boolean(),
  overdueServiceCount: v.number(),
  upcomingServices: v.array(upcomingServiceItemValidator),
});

type AssetStatus =
  | "active"
  | "in_storage"
  | "under_repair"
  | "retired"
  | "disposed";

type StatusCounts = Record<AssetStatus, number>;

type AssetRow = {
  _id: Id<"assets">;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: Id<"categories"> | null;
  locationId: Id<"locations"> | null;
  createdAt: number;
  updatedAt: number;
};

type ServiceScheduleRow = {
  _id: Id<"serviceSchedules">;
  assetId: Id<"assets">;
  nextServiceDate: string;
};

type AppSettingsRow = {
  _id: Id<"appSettings">;
  key: "global";
  dateFormat?: AppDateFormat;
  serviceSchedulingEnabled?: boolean;
};

const DEFAULT_DATE_FORMAT: AppDateFormat = "DD-MM-YYYY";
const DEFAULT_SERVICE_SCHEDULING_ENABLED = true;

function createEmptyStatusCounts(): StatusCounts {
  return {
    active: 0,
    in_storage: 0,
    under_repair: 0,
    retired: 0,
    disposed: 0,
  };
}

async function readAssets(ctx: QueryCtx) {
  return (await ctx.db.query("assets").collect()) as AssetRow[];
}

async function readSettings(ctx: QueryCtx) {
  const row = (await ctx.db
    .query("appSettings")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .first()) as AppSettingsRow | null;

  return {
    dateFormat: row?.dateFormat ?? DEFAULT_DATE_FORMAT,
    serviceSchedulingEnabled:
      row?.serviceSchedulingEnabled ?? DEFAULT_SERVICE_SCHEDULING_ENABLED,
  };
}

function buildStatusCounts(assets: AssetRow[]) {
  const counts = createEmptyStatusCounts();

  for (const asset of assets) {
    counts[asset.status] += 1;
  }

  return counts;
}

function buildRecentAssets(assets: AssetRow[]) {
  return assets
    .slice()
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 10)
    .map((asset) => ({
      _id: asset._id,
      name: asset.name,
      assetTag: asset.assetTag,
      status: asset.status,
      updatedAt: asset.updatedAt,
    }));
}

function compareBreakdown<T extends { count: number; name: string }>(
  left: T,
  right: T,
) {
  if (right.count !== left.count) {
    return right.count - left.count;
  }

  return left.name.localeCompare(right.name, undefined, {
    sensitivity: "base",
  });
}

async function buildCategoryBreakdown(ctx: QueryCtx, assets: AssetRow[]) {
  const countsByCategoryId = new Map<Id<"categories">, number>();
  for (const asset of assets) {
    if (asset.categoryId) {
      countsByCategoryId.set(
        asset.categoryId,
        (countsByCategoryId.get(asset.categoryId) ?? 0) + 1,
      );
    }
  }

  const categoryIds = Array.from(countsByCategoryId.keys());
  const categories = await Promise.all(
    categoryIds.map((categoryId) => ctx.db.get(categoryId)),
  );

  return categories
    .flatMap((category) =>
      category
        ? [
            {
              _id: category._id,
              name: category.name,
              color: category.color,
              count: countsByCategoryId.get(category._id) ?? 0,
            },
          ]
        : [],
    )
    .sort(compareBreakdown);
}

async function buildLocationBreakdown(ctx: QueryCtx, assets: AssetRow[]) {
  const countsByLocationId = new Map<Id<"locations">, number>();
  for (const asset of assets) {
    if (asset.locationId) {
      countsByLocationId.set(
        asset.locationId,
        (countsByLocationId.get(asset.locationId) ?? 0) + 1,
      );
    }
  }

  const locationIds = Array.from(countsByLocationId.keys());
  const locations = await Promise.all(
    locationIds.map((locationId) => ctx.db.get(locationId)),
  );

  return locations
    .flatMap((location) =>
      location
        ? [
            {
              _id: location._id,
              name: location.name,
              count: countsByLocationId.get(location._id) ?? 0,
            },
          ]
        : [],
    )
    .sort(compareBreakdown);
}

async function buildUpcomingServicesPreview(
  ctx: QueryCtx,
  serviceSchedulingEnabled: boolean,
) {
  if (!serviceSchedulingEnabled) {
    return {
      serviceSchedulingEnabled: false,
      overdueCount: 0,
      items: [],
    };
  }

  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const schedules = (await ctx.db
    .query("serviceSchedules")
    .withIndex("by_nextServiceDate")
    .collect()) as ServiceScheduleRow[];

  if (schedules.length === 0) {
    return {
      serviceSchedulingEnabled: true,
      overdueCount: 0,
      items: [],
    };
  }

  const previewSchedules = schedules.slice(0, 5);
  const assets = await Promise.all(
    previewSchedules.map((schedule) => ctx.db.get(schedule.assetId)),
  );

  return {
    serviceSchedulingEnabled: true,
    overdueCount: schedules.filter(
      (schedule) => schedule.nextServiceDate < todayIsoDate,
    ).length,
    items: previewSchedules.flatMap((schedule, index) => {
      const asset = assets[index];
      if (!asset) {
        return [];
      }

      return [
        {
          scheduleId: schedule._id,
          assetId: schedule.assetId,
          assetName: asset.name,
          assetTag: asset.assetTag,
          assetStatus: asset.status as AssetStatus,
          nextServiceDate: schedule.nextServiceDate,
        },
      ];
    }),
  };
}

async function buildDashboardOverview(ctx: QueryCtx) {
  const [assets, settings] = await Promise.all([readAssets(ctx), readSettings(ctx)]);
  const [categoryBreakdown, locationBreakdown, upcomingPreview] =
    await Promise.all([
      buildCategoryBreakdown(ctx, assets),
      buildLocationBreakdown(ctx, assets),
      buildUpcomingServicesPreview(ctx, settings.serviceSchedulingEnabled),
    ]);

  return {
    dateFormat: settings.dateFormat,
    totalAssets: assets.length,
    statusCounts: buildStatusCounts(assets),
    recentAssets: buildRecentAssets(assets),
    categoryBreakdown,
    locationBreakdown,
    serviceSchedulingEnabled: upcomingPreview.serviceSchedulingEnabled,
    overdueServiceCount: upcomingPreview.overdueCount,
    upcomingServices: upcomingPreview.items,
  };
}

export const getAssetCountsByStatus = query({
  args: {},
  returns: v.object({
    totalAssets: v.number(),
    statusCounts: statusCountsValidator,
  }),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const assets = await readAssets(ctx);
    return {
      totalAssets: assets.length,
      statusCounts: buildStatusCounts(assets),
    };
  },
});

export const getRecentAssets = query({
  args: {},
  returns: v.array(recentAssetValidator),
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const assets = await readAssets(ctx);
    return buildRecentAssets(assets);
  },
});

export const getUpcomingServicesPreview = query({
  args: {},
  returns: upcomingServicesPreviewValidator,
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const settings = await readSettings(ctx);
    return buildUpcomingServicesPreview(ctx, settings.serviceSchedulingEnabled);
  },
});

export const getOverview = query({
  args: {},
  returns: dashboardOverviewValidator,
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    return buildDashboardOverview(ctx);
  },
});
