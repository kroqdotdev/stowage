import PocketBase from "pocketbase";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { setPbAuthCookie } from "@/server/auth/cookies";
import { handleRouteError, parseJsonBody } from "@/server/auth/route";
import { createFirstAdmin, CreateFirstAdminInput } from "@/server/domain/users";
import { getPbUrl } from "@/server/pb/client";
import { createAdminCtx } from "@/server/pb/context";

export async function POST(req: NextRequest) {
  try {
    const body = CreateFirstAdminInput.parse(await parseJsonBody(req));
    const ctx = await createAdminCtx();
    const admin = await createFirstAdmin(ctx, body);

    // Auto-sign-in the new admin so they land on the dashboard.
    const client = new PocketBase(getPbUrl());
    client.autoCancellation(false);
    const auth = await client
      .collection("users")
      .authWithPassword(admin.email, body.password);

    const res = NextResponse.json({
      user: {
        id: auth.record.id,
        email: auth.record.email,
        name: auth.record.name,
        role: auth.record.role,
      },
    });
    setPbAuthCookie(res, auth.token);
    return res;
  } catch (error) {
    return handleRouteError(error, "api/auth/first-admin");
  }
}
