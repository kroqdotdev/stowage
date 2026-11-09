import { LabelPrintPageClient } from "@/components/labels/label-print-page-client";
import { PageHeader } from "@/components/layout/page-header";

export default function LabelPrintPage() {
  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Print labels"
          description="Check the labels, then print them from your browser."
          breadcrumbs={[
            { label: "Labels", href: "/labels" },
            { label: "Print labels" },
          ]}
        />
      </div>
      <LabelPrintPageClient />
    </div>
  );
}
