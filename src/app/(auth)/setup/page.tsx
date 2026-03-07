import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/setup-form";
import { getServerRouteAuthState } from "@/lib/server-auth";
import { getSetupPageRedirect } from "@/lib/auth-route-logic";

export default async function SetupPage() {
  const state = await getServerRouteAuthState();
  const redirectTo = getSetupPageRedirect(state);
  if (redirectTo) {
    redirect(redirectTo);
  }

  return <SetupForm />;
}
