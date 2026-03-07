import { LabelPrintPageClient } from "@/components/labels/label-print-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default function LabelPrintPage() {
  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Print labels"
          description="Review label output before sending it to your printer."
          breadcrumbs={[
            { label: "Stowage", href: "/dashboard" },
            { label: "Labels", href: "/labels" },
            { label: "Print" },
          ]}
        />
      </div>
      <LabelPrintPageClient />
    </div>
  );
}
