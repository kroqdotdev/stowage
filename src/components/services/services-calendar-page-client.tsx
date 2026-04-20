"use client";

import { useQuery } from "@tanstack/react-query";
import { ServicesCalendarMonth } from "@/components/services/services-calendar-month";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { getAppSettings } from "@/lib/api/app-settings";

export function ServicesCalendarPageClient() {
  const appSettingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  if (appSettingsQuery.isPending) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading service calendar...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ServicesNavTabs />
      {!appSettingsQuery.data?.serviceSchedulingEnabled ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
          Service scheduling is disabled by an admin. Enable it in Settings to
          use calendar planning.
        </div>
      ) : (
        <ServicesCalendarMonth />
      )}
    </div>
  );
}
