import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import type { MutationCtx, QueryCtx } from "./_generated/server"

type UserRole = "admin" | "user"

type AuthUser = {
  _id: string
  role: UserRole
}

export async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
): Promise<AuthUser> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError("Authentication required")
  }

  const user = (await ctx.db.get(userId)) as
    | { _id: string; role: UserRole }
    | null
  if (!user) {
    throw new ConvexError("User record not found")
  }

  return { _id: user._id, role: user.role }
}

export async function requireAdminUser(ctx: QueryCtx | MutationCtx): Promise<AuthUser> {
  const user = await requireAuthenticatedUser(ctx)
  if (user.role !== "admin") {
    throw new ConvexError("Admin access required")
  }
  return user
}
