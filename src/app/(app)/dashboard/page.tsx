import { DashboardStatsCard } from "@/components/dashboard/dashboard-stats-card";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { RecentAssetsCard } from "@/components/dashboard/recent-assets-card";
import { UpcomingServiceDue7DayCard } from "@/components/dashboard/upcoming-service-due-7-day-card";
import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your assets and upcoming services."
        breadcrumbs={[{ label: "Stowage", href: "/dashboard" }]}
      />
      <DashboardStatsCard />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentAssetsCard />
        <UpcomingServiceDue7DayCard />
      </div>
      <QuickActionsCard />
    </div>
  );
}
