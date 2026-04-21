"use client";

import { useMemo } from "react";
import type { FieldDefinition } from "@/components/fields/types";
import { BarcodeRenderer } from "@/components/labels/barcode-renderer";
import {
  FONT_WEIGHT_CLASS,
  MM_TO_PX,
  buildLabelAssetUrl,
  getLabelElementAriaLabel,
  isTextLabelElement,
  resolveLabelElementText,
} from "@/components/labels/helpers";
import type {
  LabelPreviewAsset,
  LabelTemplate,
  LabelTemplateElement,
} from "@/components/labels/types";
import { useLabelOrigin } from "@/components/labels/use-label-origin";
import { cn } from "@/lib/utils";

function renderLabelElement({
  element,
  asset,
  origin,
  fieldDefinitions,
}: {
  element: LabelTemplateElement;
  asset: LabelPreviewAsset | null;
  origin: string;
  fieldDefinitions?: FieldDefinition[];
}) {
  const labelText = resolveLabelElementText({
    element,
    asset,
    fieldDefinitions,
  });

  const commonStyle = {
    left: `${element.xMm}mm`,
    top: `${element.yMm}mm`,
    width: `${element.widthMm}mm`,
    height: `${element.heightMm}mm`,
  } as const;

  const ariaLabel = getLabelElementAriaLabel(element, fieldDefinitions);

  if (element.type === "barcode" || element.type === "dataMatrix") {
    const codeValue = asset
      ? buildLabelAssetUrl(asset.id, origin)
      : buildLabelAssetUrl("preview" as never, origin);

    return (
      <div
        key={element.id}
        className={cn(
          "absolute overflow-hidden",
          element.type === "dataMatrix" ? "rounded-none" : "rounded-[1.5mm]",
        )}
        style={commonStyle}
        data-element-type={element.type}
        data-element-id={element.id}
      >
        <BarcodeRenderer
          type={element.type === "barcode" ? "code128" : "datamatrix"}
          data={codeValue}
          widthMm={element.widthMm}
          heightMm={element.heightMm}
          title={ariaLabel}
          className="h-full w-full"
          squareCorners={element.type === "dataMatrix"}
        />
      </div>
    );
  }

  if (isTextLabelElement(element.type)) {
    return (
      <div
        key={element.id}
        className="absolute overflow-hidden whitespace-pre-wrap text-black"
        style={{
          ...commonStyle,
          fontSize: `${element.fontSize ?? 8}pt`,
          fontWeight: FONT_WEIGHT_CLASS[element.fontWeight ?? "normal"],
          textAlign: element.textAlign ?? "left",
          lineHeight: 1.05,
          textTransform: element.uppercase ? "uppercase" : "none",
        }}
        data-element-type={element.type}
        data-element-id={element.id}
        aria-label={ariaLabel}
      >
        <div className="line-clamp-3 h-full w-full">{labelText}</div>
      </div>
    );
  }

  return null;
}

export function LabelPreview({
  template,
  asset,
  fieldDefinitions,
  origin,
  scale = 1,
  className,
  surfaceClassName,
}: {
  template: Pick<LabelTemplate, "widthMm" | "heightMm" | "elements">;
  asset: LabelPreviewAsset | null;
  fieldDefinitions?: FieldDefinition[];
  origin?: string;
  scale?: number;
  className?: string;
  surfaceClassName?: string;
}) {
  const resolvedOrigin = useLabelOrigin(origin);
  const wrapperWidth = useMemo(
    () => template.widthMm * MM_TO_PX * scale,
    [scale, template.widthMm],
  );
  const wrapperHeight = useMemo(
    () => template.heightMm * MM_TO_PX * scale,
    [scale, template.heightMm],
  );

  return (
    <div
      className={cn("relative", className)}
      style={{ width: `${wrapperWidth}px`, height: `${wrapperHeight}px` }}
    >
      <div
        className="origin-top-left"
        style={{
          width: `${template.widthMm}mm`,
          height: `${template.heightMm}mm`,
          transform: `scale(${scale})`,
        }}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[2mm] border border-slate-300 bg-white text-black shadow-sm",
            surfaceClassName,
          )}
          style={{
            width: `${template.widthMm}mm`,
            height: `${template.heightMm}mm`,
          }}
          data-testid="label-preview-surface"
          data-label-width={template.widthMm}
          data-label-height={template.heightMm}
        >
          {template.elements.map((element) =>
            renderLabelElement({
              element,
              asset,
              origin: resolvedOrigin,
              fieldDefinitions,
            }),
          )}
        </div>
      </div>
    </div>
  );
}
