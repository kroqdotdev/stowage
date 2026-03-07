import type { Id } from "@/lib/convex-api";

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
  _id: Id<"serviceGroups">;
  _creationTime: number;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  assetCount: number;
  fieldCount: number;
};

export type ServiceGroup = {
  _id: Id<"serviceGroups">;
  _creationTime: number;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

export type ServiceGroupField = {
  _id: Id<"serviceGroupFields">;
  _creationTime: number;
  groupId: Id<"serviceGroups">;
  label: string;
  fieldType: ServiceGroupFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

export type ServiceGroupAsset = {
  _id: Id<"assets">;
  name: string;
  assetTag: string;
  status: "active" | "in_storage" | "under_repair" | "retired" | "disposed";
};

export type ServiceProvider = {
  _id: Id<"serviceProviders">;
  _creationTime: number;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
  updatedBy: Id<"users">;
};

export type ServiceProviderOption = {
  _id: Id<"serviceProviders">;
  name: string;
};

export type ServiceRecordFormDefinition = {
  assetId: Id<"assets">;
  assetName: string;
  assetTag: string;
  serviceGroupId: Id<"serviceGroups"> | null;
  serviceGroupName: string | null;
  scheduleId: Id<"serviceSchedules"> | null;
  nextServiceDate: string | null;
  fields: {
    _id: string;
    label: string;
    fieldType: ServiceGroupFieldType;
    required: boolean;
    options: string[];
    sortOrder: number;
  }[];
};

export type ServiceRecord = {
  _id: Id<"serviceRecords">;
  _creationTime: number;
  assetId: Id<"assets">;
  serviceGroupId: Id<"serviceGroups"> | null;
  serviceGroupName: string | null;
  values: Record<string, string | number | boolean | null>;
  valueEntries: {
    fieldId: string;
    label: string;
    value: string | number | boolean | null;
  }[];
  scheduleId: Id<"serviceSchedules"> | null;
  scheduledForDate: string | null;
  serviceDate: string;
  description: string;
  cost: number | null;
  providerId: Id<"serviceProviders"> | null;
  providerName: string | null;
  completedAt: number;
  completedBy: Id<"users">;
  completedByName: string;
  createdAt: number;
  updatedAt: number;
};

export type ScheduledServiceItem = {
  scheduleId: Id<"serviceSchedules">;
  assetId: Id<"assets">;
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
  _id: Id<"serviceRecordAttachments">;
  _creationTime: number;
  serviceRecordId: Id<"serviceRecords">;
  fileName: string;
  fileType: string;
  fileExtension: string;
  fileKind: "image" | "pdf" | "office";
  fileSize: number;
  uploadedBy: Id<"users">;
  uploadedAt: number;
  updatedAt: number;
  url: string | null;
};
