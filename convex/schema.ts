import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { labelTemplateElementValidator } from "./label_template_helpers";

const roleValidator = v.union(v.literal("admin"), v.literal("user"));
const assetStatusValidator = v.union(
  v.literal("active"),
  v.literal("in_storage"),
  v.literal("under_repair"),
  v.literal("retired"),
  v.literal("disposed"),
);
const attachmentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("failed"),
);
const attachmentKindValidator = v.union(
  v.literal("image"),
  v.literal("pdf"),
  v.literal("office"),
);
const serviceIntervalUnitValidator = v.union(
  v.literal("days"),
  v.literal("weeks"),
  v.literal("months"),
  v.literal("years"),
);
const serviceGroupFieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("date"),
  v.literal("checkbox"),
  v.literal("select"),
);
const serviceRecordFieldSnapshotValidator = v.object({
  fieldId: v.string(),
  label: v.string(),
  fieldType: serviceGroupFieldTypeValidator,
  required: v.boolean(),
  options: v.array(v.string()),
  sortOrder: v.number(),
});
const customFieldValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);
const customFieldValuesValidator = v.record(
  v.string(),
  customFieldValueValidator,
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: roleValidator,
    createdBy: v.union(v.id("users"), v.null()),
    createdAt: v.number(),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),
  categories: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    prefix: v.union(v.string(), v.null()),
    description: v.union(v.string(), v.null()),
    color: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_normalized_name", ["normalizedName"]),
  tags: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    color: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_normalized_name", ["normalizedName"]),
  locations: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    parentId: v.union(v.id("locations"), v.null()),
    description: v.union(v.string(), v.null()),
    path: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parentId", ["parentId"])
    .index("by_parentId_and_normalizedName", ["parentId", "normalizedName"]),
  customFieldDefinitions: defineTable({
    name: v.string(),
    fieldType: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("date"),
      v.literal("dropdown"),
      v.literal("checkbox"),
      v.literal("url"),
      v.literal("currency"),
    ),
    options: v.array(v.string()),
    required: v.boolean(),
    sortOrder: v.number(),
    usageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sortOrder", ["sortOrder"]),
  appSettings: defineTable({
    key: v.literal("global"),
    dateFormat: v.union(
      v.literal("DD-MM-YYYY"),
      v.literal("MM-DD-YYYY"),
      v.literal("YYYY-MM-DD"),
    ),
    serviceSchedulingEnabled: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_key", ["key"]),
  assets: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    assetTag: v.string(),
    status: assetStatusValidator,
    categoryId: v.union(v.id("categories"), v.null()),
    locationId: v.union(v.id("locations"), v.null()),
    serviceGroupId: v.optional(v.union(v.id("serviceGroups"), v.null())),
    notes: v.union(v.string(), v.null()),
    customFieldValues: customFieldValuesValidator,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_assetTag", ["assetTag"])
    .index("by_createdAt", ["createdAt"])
    .index("by_categoryId", ["categoryId"])
    .index("by_status", ["status"])
    .index("by_locationId", ["locationId"])
    .index("by_serviceGroupId", ["serviceGroupId"])
    .index("by_normalizedName", ["normalizedName"]),
  assetTags: defineTable({
    assetId: v.id("assets"),
    tagId: v.id("tags"),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_assetId", ["assetId"])
    .index("by_tagId", ["tagId"])
    .index("by_assetId_and_tagId", ["assetId", "tagId"]),
  attachments: defineTable({
    assetId: v.id("assets"),
    storageId: v.id("_storage"),
    originalStorageId: v.union(v.id("_storage"), v.null()),
    fileName: v.string(),
    fileType: v.string(),
    fileExtension: v.string(),
    fileKind: attachmentKindValidator,
    fileSizeOriginal: v.number(),
    fileSizeOptimized: v.union(v.number(), v.null()),
    status: attachmentStatusValidator,
    optimizationAttempts: v.number(),
    optimizationError: v.union(v.string(), v.null()),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_assetId", ["assetId"])
    .index("by_assetId_and_uploadedAt", ["assetId", "uploadedAt"])
    .index("by_status", ["status"])
    .index("by_assetId_and_status", ["assetId", "status"]),
  serviceSchedules: defineTable({
    assetId: v.id("assets"),
    nextServiceDate: v.string(),
    intervalValue: v.number(),
    intervalUnit: serviceIntervalUnitValidator,
    reminderLeadValue: v.number(),
    reminderLeadUnit: serviceIntervalUnitValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  })
    .index("by_assetId", ["assetId"])
    .index("by_nextServiceDate", ["nextServiceDate"]),
  serviceGroups: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    description: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  }).index("by_normalizedName", ["normalizedName"]),
  serviceGroupFields: defineTable({
    groupId: v.id("serviceGroups"),
    label: v.string(),
    normalizedLabel: v.string(),
    fieldType: serviceGroupFieldTypeValidator,
    required: v.boolean(),
    options: v.array(v.string()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  })
    .index("by_groupId_and_sortOrder", ["groupId", "sortOrder"])
    .index("by_groupId_and_normalizedLabel", ["groupId", "normalizedLabel"]),
  serviceRecords: defineTable({
    assetId: v.id("assets"),
    serviceGroupId: v.union(v.id("serviceGroups"), v.null()),
    serviceGroupNameSnapshot: v.optional(v.union(v.string(), v.null())),
    values: customFieldValuesValidator,
    fieldSnapshots: v.optional(v.array(serviceRecordFieldSnapshotValidator)),
    scheduleId: v.union(v.id("serviceSchedules"), v.null()),
    scheduledForDate: v.union(v.string(), v.null()),
    serviceDate: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    cost: v.optional(v.union(v.number(), v.null())),
    providerId: v.optional(v.union(v.id("serviceProviders"), v.null())),
    completedAt: v.number(),
    completedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_assetId_and_completedAt", ["assetId", "completedAt"])
    .index("by_serviceGroupId_and_completedAt", [
      "serviceGroupId",
      "completedAt",
    ]),
  serviceProviders: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    contactEmail: v.union(v.string(), v.null()),
    contactPhone: v.union(v.string(), v.null()),
    notes: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  }).index("by_normalizedName", ["normalizedName"]),
  serviceRecordAttachments: defineTable({
    serviceRecordId: v.id("serviceRecords"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileExtension: v.string(),
    fileKind: attachmentKindValidator,
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_serviceRecordId", ["serviceRecordId"])
    .index("by_serviceRecordId_and_uploadedAt", [
      "serviceRecordId",
      "uploadedAt",
    ]),
  labelTemplates: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    widthMm: v.number(),
    heightMm: v.number(),
    elements: v.array(labelTemplateElementValidator),
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  })
    .index("by_normalizedName", ["normalizedName"])
    .index("by_isDefault", ["isDefault"]),
});
