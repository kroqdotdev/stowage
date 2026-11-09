"use client";

import { FeaturesSection } from "@/components/settings/features-section";
import { PasswordChangeSection } from "@/components/settings/password-change-section";
import { RegionalSettingsSection } from "@/components/settings/regional-settings-section";
import { UpdatesSection } from "@/components/settings/updates-section";
import { UserManagementSection } from "@/components/settings/user-management-section";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

/*
  Settings: each section is a sheet on the concrete (heading + 2px rule), not
  a card. Admin sections first, then your own password.
*/
export function SettingsPageClient() {
  const { data: currentUser, isPending } = useCurrentUser();

  if (isPending) {
    return (
      <div className="max-w-[880px] space-y-10">
        {[0, 1].map((index) => (
          <div key={index}>
            <Skeleton className="mb-4 h-4 w-32 rounded-md" />
            <Skeleton className="h-2.5 w-2/3" />
            <Skeleton className="mt-3 h-2.5 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <section className="max-w-[880px]">
        <SheetHeading title="Access denied" />
        <p className="py-4 text-sm text-ink-2">
          Sign in to manage account settings.
        </p>
      </section>
    );
  }

  return (
    <div className="max-w-[880px] space-y-10">
      {currentUser.role === "admin" ? (
        <>
          <RegionalSettingsSection />
          <FeaturesSection />
          <UserManagementSection currentUserId={currentUser.id} />
          <UpdatesSection />
        </>
      ) : (
        <section>
          <SheetHeading title="Administration" />
          <p className="py-4 text-sm text-ink-2">
            Only admins can manage date format, features, users, and updates.
          </p>
        </section>
      )}

      <PasswordChangeSection />
    </div>
  );
}
