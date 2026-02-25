import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const roleValidator = v.union(v.literal("admin"), v.literal("user"))

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
  // `assetTags` is added in the assets phase when the `assets` table exists.
})
