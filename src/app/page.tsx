import { redirect } from "next/navigation"
import { getHomeRedirect } from "@/lib/auth-route-logic"
import { getServerRouteAuthState } from "@/lib/server-auth"

export default async function Home() {
  const state = await getServerRouteAuthState()
  redirect(getHomeRedirect(state))
}
