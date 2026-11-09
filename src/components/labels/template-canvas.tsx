"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FieldDefinition } from "@/components/fields/types";
import { BarcodeRenderer } from "@/components/labels/barcode-renderer";
import {
  FONT_WEIGHT_CLASS,
  LABEL_GRID_STEP_MM,
  LABEL_MIN_ELEMENT_SIZE_MM,
  MM_TO_PX,
  buildLabelAssetUrl,
  clamp,
  getLabelElementAriaLabel,
  isTextLabelElement,
  resolveLabelElementText,
  snapMm,
} from "@/components/labels/helpers";
import type {
  EditableLabelTemplate,
  LabelPreviewAsset,
  LabelTemplateElement,
} from "@/components/labels/types";
import { useLabelOrigin } from "@/components/labels/use-label-origin";
import { cn } from "@/lib/utils";

type TemplateCanvasProps = {
  template: EditableLabelTemplate;
  sampleAsset: LabelPreviewAsset | null;
  fieldDefinitions: FieldDefinition[];
  origin?: string;
  selectedElementId: string | null;
  readOnly?: boolean;
  onSelectElement: (elementId: string | null) => void;
  onChangeElement: (
    elementId: string,
    updater: (element: LabelTemplateElement) => LabelTemplateElement,
  ) => void;
  onDeleteElement: (elementId: string) => void;
};

type ActiveInteraction = {
  mode: "drag" | "resize";
  elementId: string;
  startClientX: number;
  startClientY: number;
  startElement: LabelTemplateElement;
};

function renderElementContent({
  element,
  sampleAsset,
  fieldDefinitions,
  origin,
}: {
  element: LabelTemplateElement;
  sampleAsset: LabelPreviewAsset | null;
  fieldDefinitions: FieldDefinition[];
  origin: string;
}) {
  if (element.type === "barcode" || element.type === "dataMatrix") {
    return (
      <BarcodeRenderer
        type={element.type === "barcode" ? "code128" : "datamatrix"}
        data={
          sampleAsset
            ? buildLabelAssetUrl(sampleAsset.id, origin)
            : buildLabelAssetUrl("preview", origin)
        }
        widthMm={element.widthMm}
        heightMm={element.heightMm}
        className="h-full w-full"
        squareCorners={element.type === "dataMatrix"}
      />
    );
  }

  if (!isTextLabelElement(element.type)) {
    return null;
  }

  return (
    <div
      className="line-clamp-3 h-full w-full overflow-hidden whitespace-pre-wrap text-black"
      style={{
        fontSize: `${element.fontSize ?? 8}pt`,
        fontWeight: FONT_WEIGHT_CLASS[element.fontWeight ?? "normal"],
        textAlign: element.textAlign ?? "left",
        lineHeight: 1.05,
        textTransform: element.uppercase ? "uppercase" : "none",
      }}
    >
      {resolveLabelElementText({
        element,
        asset: sampleAsset,
        fieldDefinitions,
      })}
    </div>
  );
}

export function TemplateCanvas({
  template,
  sampleAsset,
  fieldDefinitions,
  origin,
  selectedElementId,
  readOnly = false,
  onSelectElement,
  onChangeElement,
  onDeleteElement,
}: TemplateCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<ActiveInteraction | null>(null);
  // The canvas scales to the width it has, up to 560px, so it fits the
  // designer column instead of scrolling sideways.
  const [frameWidth, setFrameWidth] = useState<number | null>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrameWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  const scale = useMemo(() => {
    const maxWidthPx = frameWidth ? Math.min(560, frameWidth) : 560;
    const maxHeightPx = 360;
    const widthScale = maxWidthPx / (template.widthMm * MM_TO_PX);
    const heightScale = maxHeightPx / (template.heightMm * MM_TO_PX);
    return Number(
      Math.max(
        frameWidth ? 1 : 1.65,
        Math.min(widthScale, heightScale, 4.5),
      ).toFixed(2),
    );
  }, [frameWidth, template.heightMm, template.widthMm]);
  const wrapperWidth = template.widthMm * MM_TO_PX * scale;
  const wrapperHeight = template.heightMm * MM_TO_PX * scale;
  const resolvedOrigin = useLabelOrigin(origin);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const interaction = interactionRef.current;
      const surface = surfaceRef.current;
      if (!interaction || !surface) {
        return;
      }

      const rect = surface.getBoundingClientRect();
      const deltaMmX =
        ((event.clientX - interaction.startClientX) / rect.width) *
        template.widthMm;
      const deltaMmY =
        ((event.clientY - interaction.startClientY) / rect.height) *
        template.heightMm;

      onChangeElement(interaction.elementId, (element) => {
        if (interaction.mode === "drag") {
          const nextX = clamp(
            snapMm(interaction.startElement.xMm + deltaMmX),
            0,
            Math.max(template.widthMm - element.widthMm, 0),
          );
          const nextY = clamp(
            snapMm(interaction.startElement.yMm + deltaMmY),
            0,
            Math.max(template.heightMm - element.heightMm, 0),
          );
          return { ...element, xMm: nextX, yMm: nextY };
        }

        const nextWidth = clamp(
          snapMm(interaction.startElement.widthMm + deltaMmX),
          LABEL_MIN_ELEMENT_SIZE_MM,
          Math.max(
            template.widthMm - interaction.startElement.xMm,
            LABEL_MIN_ELEMENT_SIZE_MM,
          ),
        );
        const nextHeight = clamp(
          snapMm(interaction.startElement.heightMm + deltaMmY),
          LABEL_MIN_ELEMENT_SIZE_MM,
          Math.max(
            template.heightMm - interaction.startElement.yMm,
            LABEL_MIN_ELEMENT_SIZE_MM,
          ),
        );

        return {
          ...element,
          widthMm: nextWidth,
          heightMm: nextHeight,
        };
      });
    }

    function handlePointerUp() {
      interactionRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onChangeElement, template.heightMm, template.widthMm]);

  const selectedElement = template.elements.find(
    (element) => element.id === selectedElementId,
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-[18px] py-3">
        <div className="min-w-0">
          <h3 className="eyebrow">Canvas</h3>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {readOnly
              ? "Only admins can change label templates."
              : `Drag to move, use the corner handle to resize in ${LABEL_GRID_STEP_MM} mm steps. Arrow keys nudge.`}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[13px] font-medium text-ink-2">
          {template.widthMm} x {template.heightMm} mm
        </span>
      </div>

      <div className="overflow-x-auto bg-secondary px-4 py-6 md:px-6 md:py-8">
        <div ref={frameRef} className="w-full" aria-hidden="true" />
        <div
          className="relative mx-auto"
          style={{ width: `${wrapperWidth}px`, height: `${wrapperHeight}px` }}
        >
          <div
            ref={surfaceRef}
            className="origin-top-left"
            style={{
              width: `${template.widthMm}mm`,
              height: `${template.heightMm}mm`,
              transform: `scale(${scale})`,
            }}
          >
            <div
              className="relative overflow-hidden rounded-[2.4mm] border border-[#bdbfb7] bg-white"
              style={{
                width: `${template.widthMm}mm`,
                height: `${template.heightMm}mm`,
                backgroundImage:
                  "linear-gradient(to right, rgba(27,29,26,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,29,26,0.07) 1px, transparent 1px)",
                backgroundSize: "2mm 2mm",
              }}
              onPointerDown={() => onSelectElement(null)}
              data-testid="label-template-canvas"
            >
              {template.elements.map((element) => {
                const isSelected = element.id === selectedElement?.id;
                const ariaLabel = getLabelElementAriaLabel(
                  element,
                  fieldDefinitions,
                );

                return (
                  <button
                    key={element.id}
                    type="button"
                    className={cn(
                      "absolute overflow-hidden border bg-white/85 p-[0.6mm] text-left transition-shadow outline-none",
                      element.type === "dataMatrix"
                        ? "rounded-none"
                        : "rounded-[1.6mm]",
                      isSelected
                        ? "border-[#1b1d1a] shadow-[0_0_0_0.6mm_rgba(27,29,26,0.14)]"
                        : "border-dashed border-[#bdbfb7] hover:border-solid hover:border-[#7a7e76]",
                      readOnly ? "cursor-default" : "cursor-move",
                    )}
                    style={{
                      left: `${element.xMm}mm`,
                      top: `${element.yMm}mm`,
                      width: `${element.widthMm}mm`,
                      height: `${element.heightMm}mm`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectElement(element.id);
                    }}
                    onPointerDown={(event) => {
                      if (readOnly || event.button !== 0) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      interactionRef.current = {
                        mode: "drag",
                        elementId: element.id,
                        startClientX: event.clientX,
                        startClientY: event.clientY,
                        startElement: element,
                      };
                      onSelectElement(element.id);
                    }}
                    onKeyDown={(event) => {
                      const nudge = event.shiftKey
                        ? LABEL_GRID_STEP_MM * 2
                        : LABEL_GRID_STEP_MM;
                      if (readOnly) {
                        return;
                      }

                      if (event.key === "Delete" || event.key === "Backspace") {
                        event.preventDefault();
                        onDeleteElement(element.id);
                        return;
                      }

                      if (!event.key.startsWith("Arrow")) {
                        return;
                      }

                      event.preventDefault();
                      onChangeElement(element.id, (current) => {
                        if (event.key === "ArrowLeft") {
                          return {
                            ...current,
                            xMm: clamp(
                              snapMm(current.xMm - nudge),
                              0,
                              Math.max(template.widthMm - current.widthMm, 0),
                            ),
                          };
                        }

                        if (event.key === "ArrowRight") {
                          return {
                            ...current,
                            xMm: clamp(
                              snapMm(current.xMm + nudge),
                              0,
                              Math.max(template.widthMm - current.widthMm, 0),
                            ),
                          };
                        }

                        if (event.key === "ArrowUp") {
                          return {
                            ...current,
                            yMm: clamp(
                              snapMm(current.yMm - nudge),
                              0,
                              Math.max(template.heightMm - current.heightMm, 0),
                            ),
                          };
                        }

                        return {
                          ...current,
                          yMm: clamp(
                            snapMm(current.yMm + nudge),
                            0,
                            Math.max(template.heightMm - current.heightMm, 0),
                          ),
                        };
                      });
                    }}
                    aria-label={ariaLabel}
                  >
                    <div className="h-full w-full">
                      {renderElementContent({
                        element,
                        sampleAsset,
                        fieldDefinitions,
                        origin: resolvedOrigin,
                      })}
                    </div>
                    {!readOnly ? (
                      <span
                        className={cn(
                          "absolute right-[0.45mm] bottom-[0.45mm] block h-[1.2mm] w-[1.2mm] cursor-nwse-resize rounded-[0.3mm] border border-white bg-[#1b1d1a]",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                        onPointerDown={(event) => {
                          if (event.button !== 0) {
                            return;
                          }
                          event.preventDefault();
                          event.stopPropagation();
                          interactionRef.current = {
                            mode: "resize",
                            elementId: element.id,
                            startClientX: event.clientX,
                            startClientY: event.clientY,
                            startElement: element,
                          };
                          onSelectElement(element.id);
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
