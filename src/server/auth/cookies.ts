import type { NextResponse } from "next/server";

export const PB_AUTH_COOKIE = "pb_auth";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function setPbAuthCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: PB_AUTH_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearPbAuthCookie(res: NextResponse) {
  res.cookies.set({
    name: PB_AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
