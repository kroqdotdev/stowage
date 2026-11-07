import { Suspense } from "react";
import { LocationsPageClient } from "@/components/locations/locations-page-client";

export default function LocationsPage() {
  return (
    <Suspense>
      <LocationsPageClient />
    </Suspense>
  );
}
