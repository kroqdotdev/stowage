import {
  createAccount,
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import {
  action,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

const roleValidator = v.union(v.literal("admin"), v.literal("user"))

const userSummaryValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  email: v.string(),
  name: v.string(),
  role: roleValidator,
  createdBy: v.union(v.id("users"), v.null()),
  createdAt: v.number(),
})

type UserSummary = {
  _id: Id<"users">
  _creationTime: number
  email: string
  name: string
  role: "admin" | "user"
  createdBy: Id<"users"> | null
  createdAt: number
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function requireValidEmail(email: string) {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes("@")) {
    throw new ConvexError("Enter a valid email address")
  }
  return normalized
}

function requireValidName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new ConvexError("Name is required")
  }
  return trimmed
}

function requireValidPassword(password: string) {
  if (password.length < 8) {
    throw new ConvexError("Password must be at least 8 characters")
  }
  return password
}

function toUserSummary(
  user:
    | {
        _id: Id<"users">
        _creationTime: number
        email: string
        name: string
        role: "admin" | "user"
        createdBy: Id<"users"> | null
        createdAt: number
      }
    | null,
): UserSummary | null {
  if (!user) {
    return null
  }

  return {
    _id: user._id,
    _creationTime: user._creationTime,
    email: user.email,
    name: user.name,
    role: user.role,
    createdBy: user.createdBy,
    createdAt: user.createdAt,
  }
}

async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
): Promise<UserSummary> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError("Authentication required")
  }

  const user = (await ctx.db.get(userId)) as UserSummary | null
  if (!user) {
    throw new ConvexError("User record not found")
  }

  return user
}

async function requireActionUser(ctx: ActionCtx): Promise<UserSummary> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError("Authentication required")
  }

  const user = (await ctx.runQuery(internal.users.getUserByIdInternal, {
    userId,
  })) as UserSummary | null
  if (!user) {
    throw new ConvexError("User record not found")
  }

  return user
}

async function requireActionAdmin(ctx: ActionCtx): Promise<UserSummary> {
  const user = await requireActionUser(ctx)
  if (user.role !== "admin") {
    throw new ConvexError("Admin access required")
  }
  return user
}

export const checkFirstRun = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(1)
    return users.length === 0
  },
})

export const getUserByIdInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(userSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const user = (await ctx.db.get(args.userId)) as UserSummary | null
    return toUserSummary(user as UserSummary | null)
  },
})

export const getCurrentUser = query({
  args: {},
  returns: v.union(userSummaryValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const user = (await ctx.db.get(userId)) as UserSummary | null
    return toUserSummary(user as UserSummary | null)
  },
})

export const listUsers = query({
  args: {},
  returns: v.array(userSummaryValidator),
  handler: async (ctx) => {
    const currentUser = await requireAuthenticatedUser(ctx)
    if (currentUser.role !== "admin") {
      throw new ConvexError("Admin access required")
    }

    const users = await ctx.db.query("users").order("desc").collect()
    return users.map((user) => toUserSummary(user as UserSummary)!)
  },
})

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUser = await requireAuthenticatedUser(ctx)
    if (currentUser.role !== "admin") {
      throw new ConvexError("Admin access required")
    }

    const targetUser = (await ctx.db.get(args.userId)) as UserSummary | null
    if (!targetUser) {
      throw new ConvexError("User not found")
    }

    if (targetUser.role === "admin" && args.role !== "admin") {
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .take(2)

      if (admins.length <= 1) {
        throw new ConvexError("At least one admin is required")
      }
    }

    await ctx.db.patch(args.userId, { role: args.role })
    return null
  },
})

export const createFirstAdmin = action({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
  },
  returns: v.object({ userId: v.id("users") }),
  handler: async (ctx, args) => {
    const email = requireValidEmail(args.email)
    const name = requireValidName(args.name)
    const password = requireValidPassword(args.password)

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: password },
      profile: {
        email,
        name,
        role: "admin",
        createdBy: null,
        createdAt: Date.now(),
      },
    })

    return { userId: user._id }
  },
})

export const createUser = action({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: roleValidator,
  },
  returns: v.object({ userId: v.id("users") }),
  handler: async (ctx, args) => {
    const actor = await requireActionAdmin(ctx)
    const email = requireValidEmail(args.email)
    const name = requireValidName(args.name)
    const password = requireValidPassword(args.password)

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: password },
      profile: {
        email,
        name,
        role: args.role,
        createdBy: actor._id,
        createdAt: Date.now(),
      },
    })

    return { userId: user._id }
  },
})

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireActionUser(ctx)
    const newPassword = requireValidPassword(args.newPassword)

    let account: Awaited<ReturnType<typeof retrieveAccount>> | null = null
    try {
      account = (await retrieveAccount(ctx, {
        provider: "password",
        account: {
          id: user.email,
          secret: args.currentPassword,
        },
      })) as Awaited<ReturnType<typeof retrieveAccount>> | null
    } catch {
      account = null
    }

    if (!account) {
      throw new ConvexError("Current password is incorrect")
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: user.email,
        secret: newPassword,
      },
    })

    const sessionId = await getAuthSessionId(ctx)
    await invalidateSessions(ctx, {
      userId: user._id,
      ...(sessionId ? { except: [sessionId] } : {}),
    })

    return null
  },
})
