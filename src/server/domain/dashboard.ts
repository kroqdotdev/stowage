import type { Ctx } from "@/server/pb/context";
import { ASSET_STATUSES, type AssetStatus } from "@/server/pb/assets";
import {
  APP_DATE_FORMATS,
  type AppDateFormat,
} from "@/server/pb/custom-fields";

const DEFAULT_DATE_FORMAT: AppDateFormat = "DD-MM-YYYY";
const DEFAULT_SERVICE_SCHEDULING_ENABLED = true;

export type StatusCounts = Record<AssetStatus, number>;

export type RecentAsset = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  updatedAt: number;
};

export type CategoryBreakdownItem = {
  id: string;
  name: string;
  color: string;
  count: number;
};

export type LocationBreakdownItem = {
  id: string;
  name: string;
  count: number;
};

export type UpcomingServiceItem = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  assetStatus: AssetStatus;
  nextServiceDate: string;
};

export type UpcomingServicesPreview = {
  serviceSchedulingEnabled: boolean;
  overdueCount: number;
  items: UpcomingServiceItem[];
};

export type DashboardOverview = {
  dateFormat: AppDateFormat;
  totalAssets: number;
  statusCounts: StatusCounts;
  recentAssets: RecentAsset[];
  categoryBreakdown: CategoryBreakdownItem[];
  locationBreakdown: LocationBreakdownItem[];
  serviceSchedulingEnabled: boolean;
  overdueServiceCount: number;
  upcomingServices: UpcomingServiceItem[];
};

type AssetRow = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: string;
  locationId: string;
  createdAt: number;
  updatedAt: number;
};

type ServiceScheduleRow = {
  id: string;
  assetId: string;
  nextServiceDate: string;
};

type AppSettingsRow = {
  dateFormat?: AppDateFormat;
  serviceSchedulingEnabled?: boolean | null;
};

type CategoryRow = { id: string; name: string; color: string };
type LocationRow = { id: string; name: string };

function emptyStatusCounts(): StatusCounts {
  return {
    active: 0,
    in_storage: 0,
    under_repair: 0,
    retired: 0,
    disposed: 0,
  };
}

async function readAllAssets(ctx: Ctx) {
  return ctx.pb.collection("assets").getFullList<AssetRow>();
}

async function readSettings(ctx: Ctx) {
  try {
    const row = await ctx.pb
      .collection("appSettings")
      .getFirstListItem<AppSettingsRow>('key = "global"');
    const dateFormat = (
      APP_DATE_FORMATS as readonly string[]
    ).includes(row.dateFormat ?? "")
      ? (row.dateFormat as AppDateFormat)
      : DEFAULT_DATE_FORMAT;
    return {
      dateFormat,
      serviceSchedulingEnabled:
        row.serviceSchedulingEnabled ?? DEFAULT_SERVICE_SCHEDULING_ENABLED,
    };
  } catch {
    return {
      dateFormat: DEFAULT_DATE_FORMAT,
      serviceSchedulingEnabled: DEFAULT_SERVICE_SCHEDULING_ENABLED,
    };
  }
}

function buildStatusCounts(assets: AssetRow[]): StatusCounts {
  const counts = emptyStatusCounts();
  for (const asset of assets) counts[asset.status] += 1;
  return counts;
}

function buildRecentAssets(assets: AssetRow[]): RecentAsset[] {
  return assets
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10)
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      assetTag: asset.assetTag,
      status: asset.status,
      updatedAt: asset.updatedAt,
    }));
}

function compareBreakdown<T extends { count: number; name: string }>(
  a: T,
  b: T,
) {
  if (b.count !== a.count) return b.count - a.count;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

async function buildCategoryBreakdown(ctx: Ctx, assets: AssetRow[]) {
  const counts = new Map<string, number>();
  for (const asset of assets) {
    if (!asset.categoryId) continue;
    counts.set(asset.categoryId, (counts.get(asset.categoryId) ?? 0) + 1);
  }
  const ids = Array.from(counts.keys());
  const categories = await Promise.all(
    ids.map((id) =>
      ctx.pb
        .collection("categories")
        .getOne<CategoryRow>(id)
        .catch(() => null),
    ),
  );
  return categories
    .flatMap((category) =>
      category
        ? [
            {
              id: category.id,
              name: category.name,
              color: category.color,
              count: counts.get(category.id) ?? 0,
            },
          ]
        : [],
    )
    .sort(compareBreakdown);
}

async function buildLocationBreakdown(ctx: Ctx, assets: AssetRow[]) {
  const counts = new Map<string, number>();
  for (const asset of assets) {
    if (!asset.locationId) continue;
    counts.set(asset.locationId, (counts.get(asset.locationId) ?? 0) + 1);
  }
  const ids = Array.from(counts.keys());
  const locations = await Promise.all(
    ids.map((id) =>
      ctx.pb
        .collection("locations")
        .getOne<LocationRow>(id)
        .catch(() => null),
    ),
  );
  return locations
    .flatMap((location) =>
      location
        ? [
            {
              id: location.id,
              name: location.name,
              count: counts.get(location.id) ?? 0,
            },
          ]
        : [],
    )
    .sort(compareBreakdown);
}

async function buildUpcomingServicesPreview(
  ctx: Ctx,
  serviceSchedulingEnabled: boolean,
): Promise<UpcomingServicesPreview> {
  if (!serviceSchedulingEnabled) {
    return {
      serviceSchedulingEnabled: false,
      overdueCount: 0,
      items: [],
    };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const schedules = await ctx.pb
    .collection("serviceSchedules")
    .getFullList<ServiceScheduleRow>({ sort: "nextServiceDate" });

  if (schedules.length === 0) {
    return {
      serviceSchedulingEnabled: true,
      overdueCount: 0,
      items: [],
    };
  }

  const previewSchedules = schedules.slice(0, 5);
  const assets = await Promise.all(
    previewSchedules.map((schedule) =>
      ctx.pb
        .collection("assets")
        .getOne<AssetRow>(schedule.assetId)
        .catch(() => null),
    ),
  );

  const items: UpcomingServiceItem[] = [];
  previewSchedules.forEach((schedule, index) => {
    const asset = assets[index];
    if (!asset) return;
    items.push({
      scheduleId: schedule.id,
      assetId: schedule.assetId,
      assetName: asset.name,
      assetTag: asset.assetTag,
      assetStatus: asset.status,
      nextServiceDate: schedule.nextServiceDate,
    });
  });

  return {
    serviceSchedulingEnabled: true,
    overdueCount: schedules.filter((s) => s.nextServiceDate < todayIso).length,
    items,
  };
}

export async function getAssetCountsByStatus(
  ctx: Ctx,
): Promise<{ totalAssets: number; statusCounts: StatusCounts }> {
  const statusCounts = emptyStatusCounts();
  let totalAssets = 0;
  for (const status of ASSET_STATUSES) {
    const { totalItems } = await ctx.pb
      .collection("assets")
      .getList(1, 1, { filter: `status = "${status}"` });
    statusCounts[status] = totalItems;
    totalAssets += totalItems;
  }
  return { totalAssets, statusCounts };
}

export async function getRecentAssets(ctx: Ctx): Promise<RecentAsset[]> {
  const result = await ctx.pb
    .collection("assets")
    .getList<AssetRow>(1, 10, { sort: "-updatedAt" });
  return result.items.map((asset) => ({
    id: asset.id,
    name: asset.name,
    assetTag: asset.assetTag,
    status: asset.status,
    updatedAt: asset.updatedAt,
  }));
}

export async function getUpcomingServicesPreview(
  ctx: Ctx,
): Promise<UpcomingServicesPreview> {
  const settings = await readSettings(ctx);
  return buildUpcomingServicesPreview(ctx, settings.serviceSchedulingEnabled);
}

export async function getOverview(ctx: Ctx): Promise<DashboardOverview> {
  const [assets, settings] = await Promise.all([
    readAllAssets(ctx),
    readSettings(ctx),
  ]);
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
