"use client"

import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexReactClient } from "convex/react"
import { useState, type ReactNode } from "react"
import { AuthTokenCookieBridge } from "@/components/auth/auth-token-cookie-bridge"

export function ConvexClientProvider({
  children,
  convexUrl,
}: {
  children: ReactNode
  convexUrl: string
}) {
  const [convex] = useState(() => new ConvexReactClient(convexUrl))

  return (
    <ConvexAuthProvider client={convex}>
      <AuthTokenCookieBridge />
      {children}
    </ConvexAuthProvider>
  )
}
