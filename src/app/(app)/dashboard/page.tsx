"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardStatsBar } from "@/components/dashboard/dashboard-stats-bar";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { LocationBreakdown } from "@/components/dashboard/location-breakdown";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentAssetsCard } from "@/components/dashboard/recent-assets-card";
import { UpcomingServiceDue7DayCard } from "@/components/dashboard/upcoming-service-due-7-day-card";

export default function DashboardPage() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const stats = useQuery(api.dashboardStats.getDashboardStats, {});

  const greeting = currentUser?.name
    ? `Welcome back, ${currentUser.name}`
    : "Dashboard";

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4 [&>div:first-child]:mb-0">
        <PageHeader
          title={greeting}
          description="Overview of your assets and upcoming services."
          breadcrumbs={[{ label: "Stowage", href: "/dashboard" }]}
        />
        <QuickActions />
      </div>

      {stats ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0">
            <DashboardStatsBar
              totalAssets={stats.totalAssets}
              statusCounts={stats.statusCounts}
            />
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:grid-rows-2">
            <RecentAssetsCard />
            <UpcomingServiceDue7DayCard />
            <CategoryBreakdown items={stats.categoryBreakdown} />
            <LocationBreakdown items={stats.locationBreakdown} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      )}
    </div>
  );
}
