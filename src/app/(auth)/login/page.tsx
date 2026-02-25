import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { getLoginPageRedirect } from "@/lib/auth-route-logic"
import { getServerRouteAuthState } from "@/lib/server-auth"

export default async function LoginPage() {
  const state = await getServerRouteAuthState()
  const redirectTo = getLoginPageRedirect(state)
  if (redirectTo) {
    redirect(redirectTo)
  }

  return <LoginForm />
}
