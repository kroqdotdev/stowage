"use client"

import { useEffect } from "react"
import { useAuthToken } from "@convex-dev/auth/react"
import { syncAuthTokenCookie } from "@/lib/auth-token-cookie"

export function AuthTokenCookieBridge() {
  const token = useAuthToken()

  useEffect(() => {
    syncAuthTokenCookie(token)
  }, [token])

  return null
}
