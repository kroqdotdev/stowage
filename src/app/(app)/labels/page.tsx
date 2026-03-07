import { LabelsPageClient } from "@/components/labels/labels-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default function LabelsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels"
        description="Design reusable label templates and print accurate previews."
        breadcrumbs={[
          { label: "Stowage", href: "/dashboard" },
          { label: "Labels" },
        ]}
      />
      <LabelsPageClient />
    </div>
  );
}
