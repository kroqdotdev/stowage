import { PageHeader } from "@/components/layout/page-header";
import { ServicesListPageClient } from "@/components/services/services-list-page-client";

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Upcoming and overdue service schedule."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Services" },
        ]}
      />
      <ServicesListPageClient />
    </div>
  );
}
