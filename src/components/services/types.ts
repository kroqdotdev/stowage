export const SERVICE_GROUP_FIELD_TYPE_OPTIONS = [
  "text",
  "textarea",
  "number",
  "date",
  "checkbox",
  "select",
] as const;

export type ServiceGroupFieldType =
  (typeof SERVICE_GROUP_FIELD_TYPE_OPTIONS)[number];

export type ServiceGroupSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  assetCount: number;
  fieldCount: number;
};

export type ServiceGroup = {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type ServiceGroupField = {
  id: string;
  groupId: string;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type ServiceGroupAsset = {
  id: string;
  name: string;
  assetTag: string;
  status: "active" | "in_storage" | "under_repair" | "retired" | "disposed";
};

export type ServiceProvider = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type ServiceProviderOption = {
  id: string;
  name: string;
};

export type ServiceRecordFormDefinition = {
  assetId: string;
  assetName: string;
  assetTag: string;
  serviceGroupId: string | null;
  serviceGroupName: string | null;
  scheduleId: string | null;
  nextServiceDate: string | null;
  fields: {
    id: string;
    label: string;
    fieldType: ServiceGroupFieldType;
    required: boolean;
    options: string[];
    sortOrder: number;
  }[];
};

export type ServiceRecord = {
  id: string;
  assetId: string;
  serviceGroupId: string | null;
  serviceGroupName: string | null;
  values: Record<string, string | number | boolean | null>;
  valueEntries: {
    fieldId: string;
    label: string;
    value: string | number | boolean | null;
  }[];
  scheduleId: string | null;
  scheduledForDate: string | null;
  serviceDate: string;
  description: string;
  cost: number | null;
  providerId: string | null;
  providerName: string | null;
  completedAt: number;
  completedBy: string;
  completedByName: string;
  createdAt: number;
  updatedAt: number;
};

export type ScheduledServiceItem = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  assetStatus:
    | "active"
    | "in_storage"
    | "under_repair"
    | "retired"
    | "disposed";
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: "days" | "weeks" | "months" | "years";
  reminderLeadValue: number;
  reminderLeadUnit: "days" | "weeks" | "months" | "years";
  reminderStartDate: string;
  lastServiceDate: string | null;
  lastServiceDescription: string | null;
  lastServiceProviderName: string | null;
};

export type ServiceRecordAttachment = {
  id: string;
  serviceRecordId: string;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: "image" | "pdf" | "office";
  fileSize: number;
  uploadedBy: string;
  uploadedAt: number;
  updatedAt: number;
  url: string | null;
};
