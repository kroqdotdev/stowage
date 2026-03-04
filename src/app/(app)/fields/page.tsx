import { FieldsPageClient } from "@/components/fields/fields-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default function FieldsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom fields"
        description="Define custom fields for your assets."
      />
      <FieldsPageClient />
    </div>
  );
}
