"use client";

import { FeaturesSection } from "@/components/settings/features-section";
import { PasswordChangeSection } from "@/components/settings/password-change-section";
import { RegionalSettingsSection } from "@/components/settings/regional-settings-section";
import { UserManagementSection } from "@/components/settings/user-management-section";
import { useCurrentUser } from "@/hooks/use-current-user";

export function SettingsPageClient() {
  const { data: currentUser, isPending } = useCurrentUser();

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
        <div className="h-48 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Access denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage account settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentUser.role === "admin" ? (
        <>
          <RegionalSettingsSection />
          <FeaturesSection />
          <UserManagementSection currentUserId={currentUser.id} />
        </>
      ) : (
        <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            Administration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only admins can manage date format, features, and users.
          </p>
        </section>
      )}

      <PasswordChangeSection />
    </div>
  );
}
