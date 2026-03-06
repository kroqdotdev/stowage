import { PageHeader } from "@/components/layout/page-header";
import { ServiceGroupsList } from "@/components/services/service-groups-list";

export default function ServiceGroupsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Groups"
        description="Manage reusable service checklists and asset assignments."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Services", href: "/services" },
          { label: "Groups" },
        ]}
      />
      <ServiceGroupsList />
    </div>
  );
}
