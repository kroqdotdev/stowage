import { NextResponse } from "next/server";

import { handleRouteError } from "@/server/auth/route";
import { checkFirstRun } from "@/server/domain/users";
import { hasPbAdminCredentials } from "@/server/pb/client";
import { createAdminCtx } from "@/server/pb/context";

export async function GET() {
  try {
    if (!hasPbAdminCredentials()) {
      return NextResponse.json({
        firstRun: true,
        adminConfigReady: false,
      });
    }

    const ctx = await createAdminCtx();
    const firstRun = await checkFirstRun(ctx);
    return NextResponse.json({ firstRun, adminConfigReady: true });
  } catch (error) {
    return handleRouteError(error, "api/auth/first-run");
  }
}
