import { PageHeader } from "@/components/layout/page-header";
import { SettingsPageClient } from "@/components/settings/settings-page-client";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Date format, features, users, updates and your password."
        className="max-md:hidden"
      />
      <SettingsPageClient />
    </div>
  );
}
