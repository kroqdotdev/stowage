import { PageHeader } from "@/components/layout/page-header";
import { ServiceGroupDetailPageClient } from "@/components/services/service-group-detail-page-client";
import type { Id } from "@/lib/convex-api";

export default async function ServiceGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Group"
        description="Configure required service fields and review assigned assets."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Services", href: "/services" },
          { label: "Groups", href: "/services/groups" },
          { label: "Group detail" },
        ]}
      />
      <ServiceGroupDetailPageClient groupId={id as Id<"serviceGroups">} />
    </div>
  );
}
