import { ValidationError } from "./errors";

export const LABEL_ELEMENT_TYPES = [
  "assetName",
  "assetTag",
  "category",
  "location",
  "customField",
  "staticText",
  "barcode",
  "dataMatrix",
] as const;

export const LABEL_TEXT_ALIGN_OPTIONS = ["left", "center", "right"] as const;
export const LABEL_FONT_WEIGHT_OPTIONS = [
  "normal",
  "medium",
  "semibold",
  "bold",
] as const;

export type LabelElementType = (typeof LABEL_ELEMENT_TYPES)[number];
export type LabelTextAlign = (typeof LABEL_TEXT_ALIGN_OPTIONS)[number];
export type LabelFontWeight = (typeof LABEL_FONT_WEIGHT_OPTIONS)[number];

export type LabelTemplateElementInput = {
  id: string;
  type: LabelElementType;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSize?: number;
  fontWeight?: LabelFontWeight;
  textAlign?: LabelTextAlign;
  fieldId?: string | null;
  text?: string | null;
  uppercase?: boolean;
};

export type LabelTemplateElement = Required<
  Pick<
    LabelTemplateElementInput,
    "id" | "type" | "xMm" | "yMm" | "widthMm" | "heightMm"
  >
> & {
  fontSize?: number;
  fontWeight?: LabelFontWeight;
  textAlign?: LabelTextAlign;
  fieldId: string | null;
  text: string | null;
  uppercase?: true;
};

export function normalizeLabelTemplateName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeLabelTemplateNameKey(value: string) {
  return normalizeLabelTemplateName(value).toLocaleLowerCase();
}

function ensureFiniteNumber(value: number, message: string) {
  if (!Number.isFinite(value)) throw new ValidationError(message);
}

function normalizeDimension(value: number, label: string) {
  ensureFiniteNumber(value, `${label} must be a number`);
  if (value <= 0 || value > 200) {
    throw new ValidationError(
      `${label} must be greater than 0 and at most 200 mm`,
    );
  }
  return Number(value.toFixed(2));
}

function normalizeFontSize(value: number | undefined) {
  if (value === undefined) return undefined;
  ensureFiniteNumber(value, "Font size must be a number");
  if (value <= 0 || value > 72) {
    throw new ValidationError(
      "Font size must be greater than 0 and at most 72",
    );
  }
  return Number(value.toFixed(2));
}

export function normalizeLabelTemplateElements({
  elements,
  widthMm,
  heightMm,
}: {
  elements: LabelTemplateElementInput[];
  widthMm: number;
  heightMm: number;
}): LabelTemplateElement[] {
  const seenIds = new Set<string>();
  return elements.map((element) => {
    const id = element.id.trim();
    if (!id) throw new ValidationError("Element id is required");
    if (seenIds.has(id)) {
      throw new ValidationError("Element ids must be unique within a template");
    }
    seenIds.add(id);

    const xMm = normalizeDimension(element.xMm, "Element x position");
    const yMm = normalizeDimension(element.yMm, "Element y position");
    const nextWidth = normalizeDimension(element.widthMm, "Element width");
    const nextHeight = normalizeDimension(element.heightMm, "Element height");

    if (xMm >= widthMm || yMm >= heightMm) {
      throw new ValidationError(
        "Element position must be inside the label bounds",
      );
    }
    if (xMm + nextWidth > widthMm || yMm + nextHeight > heightMm) {
      throw new ValidationError("Element must fit within the label bounds");
    }
    if (!LABEL_ELEMENT_TYPES.includes(element.type)) {
      throw new ValidationError("Element type is invalid");
    }
    if (
      element.fontWeight !== undefined &&
      !LABEL_FONT_WEIGHT_OPTIONS.includes(element.fontWeight)
    ) {
      throw new ValidationError("Element font weight is invalid");
    }
    if (
      element.textAlign !== undefined &&
      !LABEL_TEXT_ALIGN_OPTIONS.includes(element.textAlign)
    ) {
      throw new ValidationError("Element text alignment is invalid");
    }

    const text = element.text?.trim() || null;
    if (element.type === "staticText" && !text) {
      throw new ValidationError("Static text elements require text");
    }
    if (element.type === "customField" && !element.fieldId) {
      throw new ValidationError("Custom field elements require a field");
    }

    return {
      id,
      type: element.type,
      xMm,
      yMm,
      widthMm: nextWidth,
      heightMm: nextHeight,
      fontSize: normalizeFontSize(element.fontSize),
      fontWeight: element.fontWeight,
      textAlign: element.textAlign,
      fieldId: element.fieldId ?? null,
      text,
      uppercase: element.uppercase === true ? true : undefined,
    };
  });
}

export function normalizeLabelTemplateInput({
  name,
  widthMm,
  heightMm,
  elements,
}: {
  name: string;
  widthMm: number;
  heightMm: number;
  elements: LabelTemplateElementInput[];
}) {
  const normalizedName = normalizeLabelTemplateName(name);
  if (!normalizedName) {
    throw new ValidationError("Template name is required");
  }
  const normalizedWidth = normalizeDimension(widthMm, "Width");
  const normalizedHeight = normalizeDimension(heightMm, "Height");
  const normalizedElements = normalizeLabelTemplateElements({
    elements,
    widthMm: normalizedWidth,
    heightMm: normalizedHeight,
  });
  return {
    name: normalizedName,
    normalizedName: normalizeLabelTemplateNameKey(normalizedName),
    widthMm: normalizedWidth,
    heightMm: normalizedHeight,
    elements: normalizedElements,
  };
}

export function createDefaultLabelTemplateDefinitions() {
  return [
    {
      name: "Compact 35x12 mm",
      normalizedName: "compact 35x12 mm",
      widthMm: 35,
      heightMm: 12,
      isDefault: false,
      elements: [
        {
          id: "asset-tag",
          type: "assetTag" as const,
          xMm: 2,
          yMm: 2.1,
          widthMm: 19,
          heightMm: 5.8,
          fontSize: 9,
          fontWeight: "bold" as const,
          textAlign: "left" as const,
        },
        {
          id: "matrix",
          type: "dataMatrix" as const,
          xMm: 23,
          yMm: 1,
          widthMm: 10.5,
          heightMm: 10.5,
        },
      ],
    },
    {
      name: "Thermal 57x32 mm",
      normalizedName: "thermal 57x32 mm",
      widthMm: 57,
      heightMm: 32,
      isDefault: true,
      elements: [
        {
          id: "asset-name",
          type: "assetName" as const,
          xMm: 3,
          yMm: 3,
          widthMm: 31,
          heightMm: 6.5,
          fontSize: 9,
          fontWeight: "bold" as const,
          textAlign: "left" as const,
        },
        {
          id: "asset-tag",
          type: "assetTag" as const,
          xMm: 3,
          yMm: 12,
          widthMm: 25,
          heightMm: 6,
          fontSize: 10,
          fontWeight: "bold" as const,
          textAlign: "left" as const,
        },
        {
          id: "location",
          type: "location" as const,
          xMm: 3,
          yMm: 20,
          widthMm: 31,
          heightMm: 7,
          fontSize: 6,
          textAlign: "left" as const,
        },
        {
          id: "matrix",
          type: "dataMatrix" as const,
          xMm: 38,
          yMm: 6,
          widthMm: 15,
          heightMm: 15,
        },
      ],
    },
  ].map((template) => ({
    ...template,
    elements: normalizeLabelTemplateElements({
      elements: template.elements,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
    }),
  }));
}
