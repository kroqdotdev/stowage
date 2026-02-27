import type { Id } from "@/lib/convex-api"

export const ASSET_STATUS_OPTIONS = [
  "active",
  "in_storage",
  "under_repair",
  "retired",
  "disposed",
] as const

export type AssetStatus = (typeof ASSET_STATUS_OPTIONS)[number]

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  in_storage: "In storage",
  under_repair: "Under repair",
  retired: "Retired",
  disposed: "Disposed",
}

export type AssetListItem = {
  _id: Id<"assets">
  _creationTime: number
  name: string
  assetTag: string
  status: AssetStatus
  categoryId: Id<"categories"> | null
  categoryName: string | null
  categoryColor: string | null
  locationId: Id<"locations"> | null
  locationPath: string | null
  notes: string | null
  tagIds: Id<"tags">[]
  tagNames: string[]
  createdAt: number
  updatedAt: number
}

export type AssetDetail = {
  _id: Id<"assets">
  _creationTime: number
  name: string
  assetTag: string
  status: AssetStatus
  categoryId: Id<"categories"> | null
  locationId: Id<"locations"> | null
  notes: string | null
  customFieldValues: Record<string, string | number | boolean | null>
  createdBy: Id<"users">
  updatedBy: Id<"users">
  createdAt: number
  updatedAt: number
  category: {
    _id: Id<"categories">
    name: string
    prefix: string | null
    color: string
  } | null
  location: {
    _id: Id<"locations">
    name: string
    parentId: Id<"locations"> | null
    path: string
  } | null
  tags: {
    _id: Id<"tags">
    _creationTime: number
    name: string
    color: string
    createdAt: number
    updatedAt: number
  }[]
}

export type AssetFilterOptions = {
  categories: {
    _id: Id<"categories">
    name: string
    prefix: string | null
    color: string
  }[]
  locations: {
    _id: Id<"locations">
    name: string
    parentId: Id<"locations"> | null
    path: string
  }[]
  tags: {
    _id: Id<"tags">
    _creationTime: number
    name: string
    color: string
    createdAt: number
    updatedAt: number
  }[]
}

export type AssetFormValues = {
  name: string
  categoryId: Id<"categories"> | null
  locationId: Id<"locations"> | null
  status: AssetStatus
  notes: string
  customFieldValues: Record<string, string | number | boolean | null>
  tagIds: Id<"tags">[]
}
