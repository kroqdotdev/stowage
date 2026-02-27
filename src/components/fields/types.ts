import type { Id } from "@/lib/convex-api"

export const FIELD_TYPE_OPTIONS = [
  "text",
  "number",
  "date",
  "dropdown",
  "checkbox",
  "url",
  "currency",
] as const

export type FieldType = (typeof FIELD_TYPE_OPTIONS)[number]

export type FieldDefinition = {
  _id: Id<"customFieldDefinitions">
  _creationTime: number
  name: string
  fieldType: FieldType
  options: string[]
  required: boolean
  sortOrder: number
  usageCount: number
  createdAt: number
  updatedAt: number
}

export type FieldValue = string | number | boolean | null | undefined
