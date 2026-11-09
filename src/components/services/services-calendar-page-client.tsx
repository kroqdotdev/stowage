"use client";

import { useQuery } from "@tanstack/react-query";
import { ServicesCalendarMonth } from "@/components/services/services-calendar-month";
import { SchedulingDisabled } from "@/components/services/scheduling-disabled";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppSettings } from "@/lib/api/app-settings";

export function ServicesCalendarPageClient() {
  const appSettingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  if (appSettingsQuery.isPending) {
    return (
      <div className="space-y-4 py-2" aria-busy="true">
        <span className="sr-only">Loading service calendar...</span>
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    );
  }

  return (
    <div>
      {!appSettingsQuery.data?.serviceSchedulingEnabled ? (
        <SchedulingDisabled />
      ) : (
        <ServicesCalendarMonth />
      )}
    </div>
  );
}
