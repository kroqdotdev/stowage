import { PageHeader } from "@/components/layout/page-header";
import { LocationsPageClient } from "@/components/locations/locations-page-client";

export default function LocationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Manage your location hierarchy."
      />
      <LocationsPageClient />
    </div>
  );
}
