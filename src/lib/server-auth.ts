import "server-only";

import { cookies } from "next/headers";

import { PB_AUTH_COOKIE } from "@/server/auth/cookies";
import { resolveSession } from "@/server/auth/session";
import { checkFirstRun } from "@/server/domain/users";
import { createAdminCtx } from "@/server/pb/context";

import type { RouteAuthState } from "./auth-route-logic";

async function readPbToken() {
  const store = await cookies();
  return store.get(PB_AUTH_COOKIE)?.value ?? null;
}

export async function getServerRouteAuthState(): Promise<RouteAuthState> {
  const token = await readPbToken();

  const [user, ctx] = await Promise.all([
    resolveSession(token),
    createAdminCtx(),
  ]);
  const firstRun = await checkFirstRun(ctx);

  return {
    firstRun,
    isAuthenticated: user !== null,
  };
}
