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
      <UpcomingServiceDue7DayCard />
    </div>
  );
}
