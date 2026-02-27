"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { Loader2 } from "lucide-react"
import { getLoginErrorMessage } from "@/components/auth/auth-error-messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthPanel } from "@/components/auth/auth-panel"
import { setAuthTokenCookie } from "@/lib/auth-token-cookie"
import { api } from "@/lib/convex-api"
import { useQuery } from "convex/react"

export function LoginForm() {
  const router = useRouter()
  const { signIn } = useAuthActions()
  const authToken = useAuthToken()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const firstRun = useQuery(api.users.checkFirstRun, {})

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated && authToken) {
      setAuthTokenCookie(authToken)
      router.replace("/dashboard")
    }
  }, [authToken, isAuthenticated, isLoading, router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const result = await signIn("password", {
        flow: "signIn",
        email: email.trim().toLowerCase(),
        password,
      })

      if (!result.signingIn) {
        setError("Invalid email or password")
      }
    } catch (caught) {
      setError(getLoginErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPanel
      title="Sign in"
      description="Use your email and password to access Stowage."
      footer={
        firstRun
          ? {
              prompt: "First time here?",
              href: "/setup",
              linkLabel: "Create the admin account",
            }
          : undefined
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={submitting || isLoading}
        >
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitting ? "Signing in..." : "Sign in"}
        </Button>

        {firstRun ? (
          <p className="text-center text-xs text-muted-foreground">
            Setup is not complete yet. Go to{" "}
            <Link
              href="/setup"
              className="underline underline-offset-4 hover:text-foreground"
            >
              /setup
            </Link>
            .
          </p>
        ) : null}
      </form>
    </AuthPanel>
  )
}
