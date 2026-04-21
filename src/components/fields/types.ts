export const FIELD_TYPE_OPTIONS = [
  "text",
  "number",
  "date",
  "dropdown",
  "checkbox",
  "url",
  "currency",
] as const;

export type FieldType = (typeof FIELD_TYPE_OPTIONS)[number];

export type FieldDefinition = {
  id: string;
  name: string;
  fieldType: FieldType;
  options: string[];
  required: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

export type FieldValue = string | number | boolean | null | undefined;
