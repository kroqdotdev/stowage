import { PageHeader } from "@/components/layout/page-header";
import { ServicesCalendarPageClient } from "@/components/services/services-calendar-page-client";

export default function ServicesCalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Services Calendar"
        description="Month view of scheduled due dates."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Services", href: "/services" },
          { label: "Calendar" },
        ]}
      />
      <ServicesCalendarPageClient />
    </div>
  );
}
