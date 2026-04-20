import { apiFetch } from "@/lib/api-client";
import type { AssetStatus } from "./assets";

export type AppDateFormat = "DD-MM-YYYY" | "MM-DD-YYYY" | "YYYY-MM-DD";

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

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { overview } = await apiFetch<{ overview: DashboardOverview }>(
    "/api/dashboard",
  );
  return overview;
}
