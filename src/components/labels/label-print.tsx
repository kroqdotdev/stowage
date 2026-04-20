"use client";

import type { FieldDefinition } from "@/components/fields/types";
import { formatLabelDimensions } from "@/components/labels/helpers";
import { LabelPreview } from "@/components/labels/label-preview";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";

export function LabelPrint({
  template,
  assets,
  fieldDefinitions,
  origin,
}: {
  template: Pick<LabelTemplate, "name" | "widthMm" | "heightMm" | "elements">;
  assets: LabelPreviewAsset[];
  fieldDefinitions?: FieldDefinition[];
  origin?: string;
}) {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${template.widthMm}mm ${template.heightMm}mm;
            margin: 0;
          }

          body {
            background: white !important;
          }

          [data-slot="sidebar-gap"],
          [data-slot="sidebar-container"],
          [data-slot="sidebar-inset"] > header {
            display: none !important;
          }

          [data-slot="sidebar-inset"] {
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          [data-slot="sidebar-inset"] > main {
            padding: 0 !important;
            overflow: visible !important;
          }

          [data-print-controls] {
            display: none !important;
          }

          [data-print-page] {
            padding: 0 !important;
            margin: 0 !important;
          }

          [data-print-label-sheet] {
            gap: 0 !important;
          }

          [data-print-label] {
            min-height: ${template.heightMm}mm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            break-after: page;
            page-break-after: always;
          }

          [data-print-label]:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="space-y-4" data-print-label-sheet>
        {assets.map((asset) => (
          <section
            key={asset.id}
            className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm print:border-0 print:bg-transparent print:p-0 print:shadow-none"
            data-print-label
          >
            <div className="mb-3 flex items-start justify-between gap-3 print:hidden">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  {asset.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {asset.assetTag}
                </p>
              </div>
              <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {formatLabelDimensions(template.widthMm, template.heightMm)}
              </span>
            </div>

            <div className="flex justify-center print:block">
              <LabelPreview
                template={template}
                asset={asset}
                fieldDefinitions={fieldDefinitions}
                origin={origin}
                scale={1}
                className="print:!h-auto print:!w-auto"
                surfaceClassName="print:rounded-none print:border-0 print:shadow-none"
              />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
