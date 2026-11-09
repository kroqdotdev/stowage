"use client";

import {
  Barcode,
  FileType,
  FolderTree,
  MapPin,
  Package,
  Shapes,
  Tag,
  Type,
} from "lucide-react";
import { getLabelElementLabel } from "@/components/labels/helpers";
import type { LabelElementType } from "@/components/labels/types";
import { Button } from "@/components/ui/button";

const ELEMENT_OPTIONS: Array<{
  type: LabelElementType;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: "assetName",
    description: "Large readable asset name",
    icon: Package,
  },
  { type: "assetTag", description: "Short tag or inventory code", icon: Tag },
  { type: "category", description: "Asset category label", icon: Shapes },
  { type: "location", description: "Location path or area", icon: MapPin },
  {
    type: "customField",
    description: "One custom field value",
    icon: FolderTree,
  },
  { type: "staticText", description: "Fixed helper text", icon: Type },
  { type: "barcode", description: "Code 128 asset URL", icon: Barcode },
  {
    type: "dataMatrix",
    description: "Compact Data Matrix asset URL",
    icon: FileType,
  },
];

export function ElementToolbar({
  canEdit,
  canAddCustomField,
  onAddElement,
}: {
  canEdit: boolean;
  canAddCustomField: boolean;
  onAddElement: (type: LabelElementType) => void;
}) {
  return (
    <section
      aria-labelledby="label-element-toolbar-title"
      className="border-t border-border px-[18px] py-3.5"
    >
      <h3 id="label-element-toolbar-title" className="eyebrow mb-2.5">
        Add to label
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {ELEMENT_OPTIONS.map((option) => {
          const disabled =
            !canEdit || (option.type === "customField" && !canAddCustomField);
          return (
            <Button
              key={option.type}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onAddElement(option.type)}
              disabled={disabled}
              data-label-element={option.type}
              title={
                option.type === "customField" && !canAddCustomField
                  ? "Create a custom field first"
                  : option.description
              }
            >
              <option.icon className="size-3.5" />
              {getLabelElementLabel(option.type)}
            </Button>
          );
        })}
      </div>
      {canEdit && !canAddCustomField ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Custom field needs a field first. Add one under Taxonomy.
        </p>
      ) : null}
    </section>
  );
}
