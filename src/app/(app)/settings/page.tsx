import { PageHeader } from "@/components/layout/page-header";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage regional preferences, users, roles, and account security."
      />
      <SettingsPageClient />
    </div>
  );
}
