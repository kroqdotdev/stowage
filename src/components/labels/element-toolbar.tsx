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
import { cn } from "@/lib/utils";

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
    <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Elements</h3>
        <p className="text-xs text-muted-foreground">
          Add fields and codes, then position them on the canvas.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {ELEMENT_OPTIONS.map((option) => {
          const disabled =
            !canEdit || (option.type === "customField" && !canAddCustomField);
          return (
            <Button
              key={option.type}
              type="button"
              variant="outline"
              className={cn(
                "h-auto min-h-11 justify-start gap-3 rounded-xl px-3 py-3 text-left",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              )}
              onClick={() => onAddElement(option.type)}
              disabled={disabled}
              data-label-element={option.type}
            >
              <option.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {getLabelElementLabel(option.type)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option.type === "customField" && !canAddCustomField
                    ? "Create a custom field first"
                    : option.description}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
