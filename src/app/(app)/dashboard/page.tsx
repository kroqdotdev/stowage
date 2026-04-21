"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardStatsBar } from "@/components/dashboard/dashboard-stats-bar";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { LocationBreakdown } from "@/components/dashboard/location-breakdown";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentAssetsCard } from "@/components/dashboard/recent-assets-card";
import { UpcomingServicesWidget } from "@/components/dashboard/upcoming-services-widget";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getDashboardOverview } from "@/lib/api/dashboard";

export default function DashboardPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: overview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
  });

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

      {overview ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0">
            <DashboardStatsBar
              totalAssets={overview.totalAssets}
              statusCounts={overview.statusCounts}
            />
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:grid-rows-2">
            <RecentAssetsCard
              items={overview.recentAssets}
              dateFormat={overview.dateFormat}
            />
            <UpcomingServicesWidget
              items={overview.upcomingServices}
              overdueCount={overview.overdueServiceCount}
              serviceSchedulingEnabled={overview.serviceSchedulingEnabled}
              dateFormat={overview.dateFormat}
            />
            <CategoryBreakdown items={overview.categoryBreakdown} />
            <LocationBreakdown items={overview.locationBreakdown} />
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
