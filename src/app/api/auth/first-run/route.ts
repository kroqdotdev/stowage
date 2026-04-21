import { NextResponse } from "next/server";

import { handleRouteError } from "@/server/auth/route";
import { checkFirstRun } from "@/server/domain/users";
import { createAdminCtx } from "@/server/pb/context";

export async function GET() {
  try {
    const ctx = await createAdminCtx();
    const firstRun = await checkFirstRun(ctx);
    return NextResponse.json({ firstRun });
  } catch (error) {
    return handleRouteError(error, "api/auth/first-run");
  }
}
