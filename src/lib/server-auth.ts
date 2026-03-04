import "server-only";

import { fetchQuery } from "convex/nextjs";
import { cookies } from "next/headers";
import { api } from "@/lib/convex-api";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth-token-cookie";
import type { RouteAuthState } from "@/lib/auth-route-logic";

function getConvexUrl() {
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "Missing Convex URL. Set CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) in your environment.",
    );
  }
  return url;
}

async function getAuthTokenFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

async function getServerIsAuthenticated() {
  const token = await getAuthTokenFromCookie();
  if (!token) {
    return false;
  }

  try {
    return await fetchQuery(
      api.auth.isAuthenticated,
      {},
      { token, url: getConvexUrl() },
    );
  } catch {
    return false;
  }
}

export async function getServerRouteAuthState(): Promise<RouteAuthState> {
  const convexUrl = getConvexUrl();

  const [firstRun, isAuthenticated] = await Promise.all([
    fetchQuery(api.users.checkFirstRun, {}, { url: convexUrl }),
    getServerIsAuthenticated(),
  ]);

  return {
    firstRun,
    isAuthenticated,
  };
}
