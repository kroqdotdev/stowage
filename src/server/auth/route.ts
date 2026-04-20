import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DomainError } from "@/server/pb/errors";

import { PB_AUTH_COOKIE } from "./cookies";
import {
  createRequestSession,
  requireAdmin,
  requireUser,
  type RequestSession,
  type SessionUser,
} from "./session";

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
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}

type Handler<R> = (
  req: NextRequest,
  session: RequestSession,
) => Promise<R | NextResponse>;

export function withSession<R>(context: string, handler: Handler<R>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await getRequestSession(req);
      const result = await handler(req, session);
      if (result instanceof NextResponse) return result;
      return NextResponse.json(result);
    } catch (error) {
      return handleRouteError(error, context);
    }
  };
}

export function withUser<R>(
  context: string,
  handler: (
    req: NextRequest,
    session: RequestSession,
    user: SessionUser,
  ) => Promise<R | NextResponse>,
) {
  return withSession(context, async (req, session) => {
    const user = requireUser(session);
    return handler(req, session, user);
  });
}

export function withAdmin<R>(
  context: string,
  handler: (
    req: NextRequest,
    session: RequestSession,
    user: SessionUser,
  ) => Promise<R | NextResponse>,
) {
  return withSession(context, async (req, session) => {
    const user = requireAdmin(session);
    return handler(req, session, user);
  });
}

export async function parseJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new DomainError("Invalid JSON body", 400);
  }
}
