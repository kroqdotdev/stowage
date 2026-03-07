import type { Id } from "@/lib/convex-api";

export const LABEL_ELEMENT_TYPE_OPTIONS = [
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

export type LabelElementType = (typeof LABEL_ELEMENT_TYPE_OPTIONS)[number];
export type LabelTextAlign = (typeof LABEL_TEXT_ALIGN_OPTIONS)[number];
export type LabelFontWeight = (typeof LABEL_FONT_WEIGHT_OPTIONS)[number];

export type LabelTemplateElement = {
  id: string;
  type: LabelElementType;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSize?: number;
  fontWeight?: LabelFontWeight;
  textAlign?: LabelTextAlign;
  fieldId?: Id<"customFieldDefinitions"> | null;
  text?: string | null;
  uppercase?: boolean;
};

export type LabelTemplate = {
  _id: Id<"labelTemplates">;
  _creationTime: number;
  name: string;
  widthMm: number;
  heightMm: number;
  elements: LabelTemplateElement[];
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

export type EditableLabelTemplate = {
  _id: Id<"labelTemplates"> | null;
  name: string;
  widthMm: number;
  heightMm: number;
  elements: LabelTemplateElement[];
  isDefault: boolean;
};

export type LabelPreviewAsset = {
  _id: Id<"assets">;
  name: string;
  assetTag: string;
  categoryName: string | null;
  locationPath: string | null;
  notes: string | null;
  customFieldValues: Record<string, string | number | boolean | null>;
};

export type LabelTemplateDimensionPreset = {
  label: string;
  widthMm: number;
  heightMm: number;
};
