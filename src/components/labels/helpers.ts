import type { FieldDefinition } from "@/components/fields/types";
import type { Id } from "@/lib/convex-api";
import type {
  EditableLabelTemplate,
  LabelElementType,
  LabelPreviewAsset,
  LabelTemplate,
  LabelTemplateDimensionPreset,
  LabelTemplateElement,
} from "@/components/labels/types";

export const LABEL_DIMENSION_PRESETS: LabelTemplateDimensionPreset[] = [
  { label: "35 x 12 mm", widthMm: 35, heightMm: 12 },
  { label: "57 x 32 mm", widthMm: 57, heightMm: 32 },
];

export const LABEL_GRID_STEP_MM = 0.5;
export const LABEL_MIN_ELEMENT_SIZE_MM = 2;
export const MM_TO_PX = 96 / 25.4;

const LABEL_ELEMENT_LABELS: Record<LabelElementType, string> = {
  assetName: "Asset name",
  assetTag: "Asset tag",
  category: "Category",
  location: "Location",
  customField: "Custom field",
  staticText: "Static text",
  barcode: "Barcode",
  dataMatrix: "Data Matrix",
};

const TEXT_ELEMENT_TYPES = new Set<LabelElementType>([
  "assetName",
  "assetTag",
  "category",
  "location",
  "customField",
  "staticText",
]);

export const FONT_WEIGHT_CLASS: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export function formatLabelDimensions(widthMm: number, heightMm: number) {
  return `${stripTrailingZeros(widthMm)} x ${stripTrailingZeros(heightMm)} mm`;
}

function stripTrailingZeros(value: number) {
  return value % 1 === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function getLabelElementLabel(type: LabelElementType) {
  return LABEL_ELEMENT_LABELS[type];
}

export function isTextLabelElement(type: LabelElementType) {
  return TEXT_ELEMENT_TYPES.has(type);
}

export function snapMm(value: number) {
  return roundMm(Math.round(value / LABEL_GRID_STEP_MM) * LABEL_GRID_STEP_MM);
}

export function roundMm(value: number) {
  return Number(value.toFixed(2));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampDimension(value: number, maxValue: number) {
  return clamp(
    snapMm(value),
    LABEL_MIN_ELEMENT_SIZE_MM,
    Math.max(maxValue, LABEL_MIN_ELEMENT_SIZE_MM),
  );
}

function getDefaultSize(type: LabelElementType) {
  switch (type) {
    case "barcode":
      return { widthMm: 24, heightMm: 8 };
    case "dataMatrix":
      return { widthMm: 14, heightMm: 14 };
    case "assetName":
      return { widthMm: 28, heightMm: 6 };
    case "location":
      return { widthMm: 28, heightMm: 6 };
    case "staticText":
      return { widthMm: 20, heightMm: 5 };
    case "customField":
      return { widthMm: 20, heightMm: 5 };
    case "category":
      return { widthMm: 18, heightMm: 5 };
    case "assetTag":
    default:
      return { widthMm: 20, heightMm: 5 };
  }
}

export function createLabelElementDraft({
  type,
  index,
  template,
  fieldId,
}: {
  type: LabelElementType;
  index: number;
  template: Pick<EditableLabelTemplate, "widthMm" | "heightMm">;
  fieldId?: Id<"customFieldDefinitions"> | null;
}): LabelTemplateElement {
  const offset = Math.min(index * 1.5, 8);
  const { widthMm, heightMm } = getDefaultSize(type);
  const nextWidth = Math.min(
    widthMm,
    Math.max(template.widthMm - 4, LABEL_MIN_ELEMENT_SIZE_MM),
  );
  const nextHeight = Math.min(
    heightMm,
    Math.max(template.heightMm - 4, LABEL_MIN_ELEMENT_SIZE_MM),
  );

  return {
    id: `${type}-${index + 1}`,
    type,
    xMm: clamp(2 + offset, 0, Math.max(template.widthMm - nextWidth, 0)),
    yMm: clamp(2 + offset, 0, Math.max(template.heightMm - nextHeight, 0)),
    widthMm: roundMm(nextWidth),
    heightMm: roundMm(nextHeight),
    fontSize:
      type === "barcode" || type === "dataMatrix"
        ? undefined
        : type === "location"
          ? 6
          : 8,
    fontWeight:
      type === "assetName" || type === "assetTag" || type === "staticText"
        ? "bold"
        : undefined,
    textAlign: type === "dataMatrix" ? undefined : "left",
    fieldId: type === "customField" ? (fieldId ?? null) : undefined,
    text: type === "staticText" ? "Static text" : undefined,
    uppercase: type === "assetTag" ? true : undefined,
  };
}

export function cloneEditableLabelTemplate(
  template: LabelTemplate | EditableLabelTemplate,
): EditableLabelTemplate {
  return {
    _id: template._id,
    name: template.name,
    widthMm: template.widthMm,
    heightMm: template.heightMm,
    elements: template.elements.map((element) => ({ ...element })),
    isDefault: template.isDefault,
  };
}

export function createEmptyLabelTemplate(): EditableLabelTemplate {
  return {
    _id: null,
    name: "",
    widthMm: 57,
    heightMm: 32,
    elements: [],
    isDefault: false,
  };
}

export function applyDimensionPreset(
  template: EditableLabelTemplate,
  preset: LabelTemplateDimensionPreset,
): EditableLabelTemplate {
  return {
    ...template,
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    elements: template.elements.map((element) => ({
      ...element,
      xMm: clamp(element.xMm, 0, Math.max(preset.widthMm - element.widthMm, 0)),
      yMm: clamp(
        element.yMm,
        0,
        Math.max(preset.heightMm - element.heightMm, 0),
      ),
      widthMm: Math.min(element.widthMm, preset.widthMm),
      heightMm: Math.min(element.heightMm, preset.heightMm),
    })),
  };
}

export function buildLabelAssetUrl(
  assetId: Id<"assets"> | string,
  origin: string,
) {
  return `${origin.replace(/\/$/, "")}/assets/${assetId}`;
}

export function resolveAppOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return "https://stowage.local";
}

export function resolveLabelElementText({
  element,
  asset,
  fieldDefinitions,
}: {
  element: LabelTemplateElement;
  asset: LabelPreviewAsset | null;
  fieldDefinitions?: FieldDefinition[];
}) {
  switch (element.type) {
    case "assetName":
      return asset?.name || "Asset name";
    case "assetTag":
      return asset?.assetTag || "AST-0001";
    case "category":
      return asset?.categoryName || "Category";
    case "location":
      return asset?.locationPath || "Location";
    case "staticText":
      return element.text?.trim() || "Static text";
    case "customField": {
      const fieldKey = element.fieldId ? String(element.fieldId) : "";
      const value = fieldKey ? asset?.customFieldValues[fieldKey] : undefined;
      if (value !== null && value !== undefined && `${value}`.trim() !== "") {
        return `${value}`;
      }
      const definition = fieldDefinitions?.find(
        (field) => String(field._id) === fieldKey,
      );
      return definition?.name ?? "Custom field";
    }
    default:
      return "";
  }
}

export function getLabelElementAriaLabel(
  element: LabelTemplateElement,
  fieldDefinitions?: FieldDefinition[],
) {
  if (element.type !== "customField") {
    return getLabelElementLabel(element.type);
  }

  const definition = fieldDefinitions?.find(
    (field) => String(field._id) === String(element.fieldId ?? ""),
  );
  return definition ? `Custom field: ${definition.name}` : "Custom field";
}

export function hasTemplateChanged(
  template: EditableLabelTemplate,
  baseline: EditableLabelTemplate | null,
) {
  if (!baseline) {
    return true;
  }

  return JSON.stringify(template) !== JSON.stringify(baseline);
}
