import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { clearPbAuthCookie } from "@/server/auth/cookies";
import { getRequestSession, handleRouteError } from "@/server/auth/route";

export async function GET(req: NextRequest) {
  try {
    const session = await getRequestSession(req);
    if (!session.user) {
      const res = NextResponse.json({ user: null });
      // Clear stale cookie if the token failed to refresh.
      if (session.token) clearPbAuthCookie(res);
      return res;
    }
    return NextResponse.json({ user: session.user });
  } catch (error) {
    return handleRouteError(error, "api/auth/me");
  }
}
