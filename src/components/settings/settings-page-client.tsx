"use client"

import { useQuery } from "convex/react"
import { PasswordChangeSection } from "@/components/settings/password-change-section"
import { RegionalSettingsSection } from "@/components/settings/regional-settings-section"
import { UserManagementSection } from "@/components/settings/user-management-section"
import { api } from "@/lib/convex-api"

export function SettingsPageClient() {
  const currentUser = useQuery(api.users.getCurrentUser, {})

  if (currentUser === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
        <div className="h-48 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Access denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage account settings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {currentUser.role === "admin" ? (
        <>
          <RegionalSettingsSection />
          <UserManagementSection currentUserId={currentUser._id} />
        </>
      ) : (
        <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">User management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only admins can create users or change roles.
          </p>
        </section>
      )}

      <PasswordChangeSection />
    </div>
  )
}
