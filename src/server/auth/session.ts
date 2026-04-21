import PocketBase, { ClientResponseError } from "pocketbase";

import { getPbUrl } from "@/server/pb/client";
import { createAdminCtx, type Ctx } from "@/server/pb/context";
import { DomainError } from "@/server/pb/errors";
import type { UserRole } from "@/server/pb/users";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type RequestSession = {
  ctx: Ctx;
  user: SessionUser | null;
  token: string | null;
  activeToken: string | null;
  staleToken: boolean;
};

class UnauthorizedError extends DomainError {
  constructor(message = "Authentication required") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends DomainError {
  constructor(message = "Admin access required") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export { UnauthorizedError, ForbiddenError };

type ActiveSession = {
  user: SessionUser;
  token: string;
};

async function refreshSession(
  token: string | null | undefined,
): Promise<ActiveSession | null> {
  if (!token) return null;

  const client = new PocketBase(getPbUrl());
  client.autoCancellation(false);
  client.authStore.save(token, null);

  try {
    const auth = await client.collection("users").authRefresh();
    return {
      token: auth.token,
      user: {
        id: auth.record.id,
        email: auth.record.email,
        name: auth.record.name,
        role: auth.record.role as UserRole,
      },
    };
  } catch (error) {
    if (error instanceof ClientResponseError) {
      return null;
    }
    throw error;
  }
}

export async function resolveSession(
  token: string | null | undefined,
): Promise<SessionUser | null> {
  const session = await refreshSession(token);
  return session?.user ?? null;
}

export async function createRequestSession(
  token: string | null | undefined,
): Promise<RequestSession> {
  const incomingToken = token ?? null;
  const [ctx, session] = await Promise.all([
    createAdminCtx(),
    refreshSession(incomingToken),
  ]);
  return {
    ctx,
    user: session?.user ?? null,
    token: incomingToken,
    activeToken: session?.token ?? null,
    staleToken: incomingToken !== null && session === null,
  };
}

export function requireUser(session: RequestSession): SessionUser {
  if (!session.user) {
    throw new UnauthorizedError();
  }
  return session.user;
}

export function requireAdmin(session: RequestSession): SessionUser {
  const user = requireUser(session);
  if (user.role !== "admin") {
    throw new ForbiddenError();
  }
  return user;
}
