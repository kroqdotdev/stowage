import { NextResponse } from "next/server";

import { clearPbAuthCookie } from "@/server/auth/cookies";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearPbAuthCookie(res);
  return res;
}
