import { PageHeader } from "@/components/layout/page-header";
import { ServiceProvidersPageClient } from "@/components/services/service-providers-page-client";

export default function ServiceProvidersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Providers"
        description="Manage vendors and contractors used in service records."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Services", href: "/services" },
          { label: "Providers" },
        ]}
      />
      <ServiceProvidersPageClient />
    </div>
  );
}
