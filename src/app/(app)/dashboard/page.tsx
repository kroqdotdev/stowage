"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardStatsBar } from "@/components/dashboard/dashboard-stats-bar";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { LocationBreakdown } from "@/components/dashboard/location-breakdown";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentAssetsCard } from "@/components/dashboard/recent-assets-card";
import { UpcomingServicesWidget } from "@/components/dashboard/upcoming-services-widget";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getDashboardOverview } from "@/lib/api/dashboard";

export default function DashboardPage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { data: currentUser } = useCurrentUser();
  const { data: overview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
  });

  const greeting = currentUser?.name
    ? `Welcome back, ${currentUser.name}`
    : "Dashboard";

  if (!overview) {
    return (
      <div className="flex h-full flex-col gap-4">
        <PageHeader
          title={greeting}
          description="Overview of your assets and upcoming services."
          breadcrumbs={[{ label: "Stowage", href: "/dashboard" }]}
        />
        <div className="rounded-xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  const recent = (
    <RecentAssetsCard
      items={overview.recentAssets}
      dateFormat={overview.dateFormat}
    />
  );
  const upcoming = (
    <UpcomingServicesWidget
      items={overview.upcomingServices}
      overdueCount={overview.overdueServiceCount}
      serviceSchedulingEnabled={overview.serviceSchedulingEnabled}
      dateFormat={overview.dateFormat}
    />
  );
  const categoryBreakdown = (
    <CategoryBreakdown items={overview.categoryBreakdown} />
  );
  const locationBreakdown = (
    <LocationBreakdown items={overview.locationBreakdown} />
  );

  return (
    <div className="flex h-full flex-col gap-4 lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4 [&>div:first-child]:mb-0">
        <PageHeader
          title={greeting}
          description="Overview of your assets and upcoming services."
          breadcrumbs={[{ label: "Stowage", href: "/dashboard" }]}
        />
        <div className="hidden lg:block">
          <QuickActions />
        </div>
      </div>

      <div className="shrink-0">
        <DashboardStatsBar
          totalAssets={overview.totalAssets}
          statusCounts={overview.statusCounts}
        />
      </div>

      {isDesktop ? (
        <div className="grid min-h-0 flex-1 gap-4 grid-cols-2 grid-rows-2">
          {recent}
          {upcoming}
          {categoryBreakdown}
          {locationBreakdown}
        </div>
      ) : (
        <div
          className="flex flex-col gap-4"
          data-testid="dashboard-mobile-feed"
        >
          {upcoming}
          {recent}
          <QuickActions />
          <MobileCollapsibleBlock title="By category">
            {categoryBreakdown}
          </MobileCollapsibleBlock>
          <MobileCollapsibleBlock title="By location">
            {locationBreakdown}
          </MobileCollapsibleBlock>
        </div>
      )}
    </div>
  );
}

function MobileCollapsibleBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/70 bg-card shadow-sm"
      data-testid={`dashboard-collapsible-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border/60">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
