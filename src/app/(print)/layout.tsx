import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getProtectedAppRedirect } from "@/lib/auth-route-logic";
import { getServerRouteAuthState } from "@/lib/server-auth";

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getServerRouteAuthState();
  const redirectTo = getProtectedAppRedirect(state);
  if (redirectTo) {
    redirect(redirectTo);
  }

  return <AppShell>{children}</AppShell>;
}
