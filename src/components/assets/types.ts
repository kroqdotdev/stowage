export const ASSET_STATUS_OPTIONS = [
  "active",
  "in_storage",
  "under_repair",
  "retired",
  "disposed",
] as const;

export type AssetStatus = (typeof ASSET_STATUS_OPTIONS)[number];

export const SERVICE_INTERVAL_UNIT_OPTIONS = [
  "days",
  "weeks",
  "months",
  "years",
] as const;

export type ServiceIntervalUnit =
  (typeof SERVICE_INTERVAL_UNIT_OPTIONS)[number];

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "Active",
  in_storage: "In storage",
  under_repair: "Under repair",
  retired: "Retired",
  disposed: "Disposed",
};

export type AssetListItem = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  locationId: string | null;
  locationPath: string | null;
  serviceGroupId: string | null;
  notes: string | null;
  tagIds: string[];
  tagNames: string[];
  createdAt: number;
  updatedAt: number;
};

export type AssetDetail = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryId: string | null;
  locationId: string | null;
  serviceGroupId: string | null;
  notes: string | null;
  customFieldValues: Record<string, string | number | boolean | null>;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
  category: {
    id: string;
    name: string;
    prefix: string | null;
    color: string;
  } | null;
  location: {
    id: string;
    name: string;
    parentId: string | null;
    path: string;
  } | null;
  serviceGroup: {
    id: string;
    name: string;
  } | null;
  tags: {
    id: string;
    name: string;
    color: string;
    createdAt: number;
    updatedAt: number;
  }[];
};

export type AssetFilterOptions = {
  categories: {
    id: string;
    name: string;
    prefix: string | null;
    color: string;
  }[];
  locations: {
    id: string;
    name: string;
    parentId: string | null;
    path: string;
  }[];
  tags: {
    id: string;
    name: string;
    color: string;
    createdAt: number;
    updatedAt: number;
  }[];
  serviceGroups: {
    id: string;
    name: string;
  }[];
};

export type AssetFormValues = {
  name: string;
  categoryId: string | null;
  locationId: string | null;
  serviceGroupId: string | null;
  status: AssetStatus;
  notes: string;
  customFieldValues: Record<string, string | number | boolean | null>;
  tagIds: string[];
};

export type ServiceScheduleDraft = {
  nextServiceDate: string;
  intervalValue: string;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: string;
  reminderLeadUnit: ServiceIntervalUnit;
};

export const DEFAULT_SERVICE_SCHEDULE_DRAFT: ServiceScheduleDraft = {
  nextServiceDate: "",
  intervalValue: "",
  intervalUnit: "months",
  reminderLeadValue: "",
  reminderLeadUnit: "weeks",
};
