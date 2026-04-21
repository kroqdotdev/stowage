import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DomainError } from "@/server/pb/errors";

import { PB_AUTH_COOKIE, clearPbAuthCookie, setPbAuthCookie } from "./cookies";
import {
  createRequestSession,
  requireAdmin,
  requireUser,
  type RequestSession,
  type SessionUser,
} from "./session";

export type RouteContext<
  P extends Record<string, string> = Record<string, string>,
> = {
  params: Promise<P>;
};

export function getRequestToken(req: NextRequest): string | null {
  return req.cookies.get(PB_AUTH_COOKIE)?.value ?? null;
}

export async function getRequestSession(
  req: NextRequest,
): Promise<RequestSession> {
  return createRequestSession(getRequestToken(req));
}

export function handleRouteError(
  error: unknown,
  context: string,
): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request", issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  console.error(`[${context}] unexpected error`, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

type SessionHandler<R, P extends Record<string, string>> = (
  req: NextRequest,
  session: RequestSession,
  routeCtx: RouteContext<P>,
) => Promise<R | NextResponse>;

type UserHandler<R, P extends Record<string, string>> = (
  req: NextRequest,
  session: RequestSession,
  user: SessionUser,
  routeCtx: RouteContext<P>,
) => Promise<R | NextResponse>;

function applySessionCookies(res: NextResponse, session: RequestSession) {
  if (session.activeToken) {
    setPbAuthCookie(res, session.activeToken);
    return;
  }

  if (session.staleToken) {
    clearPbAuthCookie(res);
  }
}

export function withSession<
  R,
  P extends Record<string, string> = Record<string, never>,
>(context: string, handler: SessionHandler<R, P>) {
  return async (
    req: NextRequest,
    routeCtx?: RouteContext<P>,
  ): Promise<NextResponse> => {
    let session: RequestSession | null = null;
    try {
      session = await getRequestSession(req);
      const result = await handler(
        req,
        session,
        routeCtx ?? { params: Promise.resolve({} as P) },
      );
      const res =
        result instanceof NextResponse ? result : NextResponse.json(result);
      applySessionCookies(res, session);
      return res;
    } catch (error) {
      const res = handleRouteError(error, context);
      if (session) {
        applySessionCookies(res, session);
      }
      return res;
    }
  };
}

export function withUser<
  R,
  P extends Record<string, string> = Record<string, never>,
>(context: string, handler: UserHandler<R, P>) {
  return withSession<R, P>(context, async (req, session, routeCtx) => {
    const user = requireUser(session);
    return handler(req, session, user, routeCtx);
  });
}

export function withAdmin<
  R,
  P extends Record<string, string> = Record<string, never>,
>(context: string, handler: UserHandler<R, P>) {
  return withSession<R, P>(context, async (req, session, routeCtx) => {
    const user = requireAdmin(session);
    return handler(req, session, user, routeCtx);
  });
}

export async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new DomainError("Invalid JSON body", 400);
  }
}
