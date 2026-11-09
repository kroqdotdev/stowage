"use client";

import type { FieldDefinition } from "@/components/fields/types";
import { LabelPreview } from "@/components/labels/label-preview";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import { TagChip } from "@/components/ui/tag-chip";

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

          /* The Workshop shell: sidebar, rail, phone top and bottom bars. */
          body aside,
          body header,
          body nav,
          [data-slot="sidebar-gap"],
          [data-slot="sidebar-container"],
          [data-slot="sidebar-inset"] > header {
            display: none !important;
          }

          body main,
          [data-slot="sidebar-inset"] > main {
            padding: 0 !important;
            max-width: none !important;
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

      <ul
        className="grid gap-x-6 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] print:block"
        data-print-label-sheet
      >
        {assets.map((asset) => (
          <li key={asset.id} className="min-w-0 print:p-0" data-print-label>
            <div className="mb-2 flex items-center gap-2 print:hidden">
              <TagChip weight="table">{asset.assetTag}</TagChip>
              <h2 className="min-w-0 truncate text-sm font-medium text-foreground">
                {asset.name}
              </h2>
            </div>

            <div className="flex justify-center overflow-x-auto rounded-md bg-secondary p-4 print:block print:overflow-visible print:bg-transparent print:p-0">
              <LabelPreview
                template={template}
                asset={asset}
                fieldDefinitions={fieldDefinitions}
                origin={origin}
                scale={1}
                className="shrink-0 print:!h-auto print:!w-auto"
                surfaceClassName="border-line-2 shadow-none print:rounded-none print:border-0"
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
