import { apiFetch } from "@/lib/api-client";
import type { AssetStatus } from "./assets";

export type DashboardOverview = {
  counts: Array<{ status: AssetStatus; count: number }>;
  recentAssets: Array<{
    id: string;
    name: string;
    assetTag: string;
    status: AssetStatus;
    categoryName: string | null;
    categoryColor: string | null;
    locationPath: string | null;
    createdAt: number;
  }>;
  upcomingServices: Array<{
    scheduleId: string;
    assetId: string;
    assetName: string;
    assetTag: string;
    nextServiceDate: string;
  }>;
  serviceSchedulingEnabled: boolean;
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { overview } = await apiFetch<{ overview: DashboardOverview }>(
    "/api/dashboard",
  );
  return overview;
}
