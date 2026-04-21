import PocketBase, { ClientResponseError } from "pocketbase";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { setPbAuthCookie } from "@/server/auth/cookies";
import { handleRouteError, parseJsonBody } from "@/server/auth/route";
import { getPbUrl } from "@/server/pb/client";
import { ValidationError } from "@/server/pb/errors";

const LoginInput = z.object({
  email: z.string(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = LoginInput.parse(await parseJsonBody(req));

    const client = new PocketBase(getPbUrl());
    client.autoCancellation(false);

    let auth;
    try {
      auth = await client
        .collection("users")
        .authWithPassword(body.email.trim().toLowerCase(), body.password);
    } catch (error) {
      if (error instanceof ClientResponseError) {
        throw new ValidationError("Invalid email or password");
      }
      throw error;
    }

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
    return handleRouteError(error, "api/auth/login");
  }
}
