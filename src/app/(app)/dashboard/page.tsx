"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardStatsBar } from "@/components/dashboard/dashboard-stats-bar";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RecentAssetsCard } from "@/components/dashboard/recent-assets-card";
import { UpcomingServicesWidget } from "@/components/dashboard/upcoming-services-widget";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getDashboardOverview } from "@/lib/api/dashboard";

function partOfDay(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function todayTitle(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function DashboardPage() {
  const { data: currentUser } = useCurrentUser();
  const {
    data: overview,
    isError,
    isPending,
  } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
  });

  const now = new Date();
  const firstName = currentUser?.name?.split(/\s+/)[0];
  const actions = (
    <Button asChild>
      <Link href="/assets/new">
        <Plus />
        New asset…
      </Link>
    </Button>
  );

  if (isPending) {
    return (
      <div>
        <PageHeader title={todayTitle(now)} description="Loading…" actions={actions} />
        <Skeleton className="h-[88px] rounded-md" />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div>
        <PageHeader title={todayTitle(now)} actions={actions} />
        <p role="alert" className="text-sm font-medium text-destructive">
          Could not load the dashboard. Reload to try again.
        </p>
      </div>
    );
  }

  const changedToday = overview.recentAssets.filter(
    (asset) => now.getTime() - asset.updatedAt < 24 * 60 * 60 * 1000,
  ).length;
  const overdue = overview.serviceSchedulingEnabled
    ? overview.overdueServiceCount
    : 0;

  const summary = (
    <>
      {partOfDay(now)}
      {firstName ? `, ${firstName}` : ""}.{" "}
      {overdue > 0 ? (
        <>
          <Link href="/services">
            {overdue} {overdue === 1 ? "service" : "services"} overdue
          </Link>
          {changedToday > 0 ? " and " : "."}
        </>
      ) : changedToday > 0 ? null : (
        "Nothing is overdue."
      )}
      {changedToday > 0 ? (
        <>
          <Link href="/assets">
            {changedToday} {changedToday === 1 ? "asset" : "assets"} changed
          </Link>{" "}
          in the last day.
        </>
      ) : null}
    </>
  );

  return (
    <div>
      <PageHeader title={todayTitle(now)} description={summary} actions={actions} />

      <DashboardStatsBar
        totalAssets={overview.totalAssets}
        statusCounts={overview.statusCounts}
        overdueCount={overdue}
      />

      <div className="mt-7 grid gap-7 min-[861px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
        <UpcomingServicesWidget
          items={overview.upcomingServices}
          overdueCount={overdue}
          scheduledCount={overview.scheduledServiceCount}
          serviceSchedulingEnabled={overview.serviceSchedulingEnabled}
          dateFormat={overview.dateFormat}
        />
        <div className="grid content-start gap-7">
          <CategoryBreakdown items={overview.categoryBreakdown} />
          <RecentAssetsCard items={overview.recentAssets} />
        </div>
      </div>
    </div>
  );
}
