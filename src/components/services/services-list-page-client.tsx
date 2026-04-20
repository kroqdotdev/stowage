"use client";

import { useQuery } from "@tanstack/react-query";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { ServicesScheduledList } from "@/components/services/services-scheduled-list";
import { getAppSettings } from "@/lib/api/app-settings";

export function ServicesListPageClient() {
  const appSettingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  if (appSettingsQuery.isPending) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading services planner...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ServicesNavTabs />
      {!appSettingsQuery.data?.serviceSchedulingEnabled ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
          Service scheduling is disabled by an admin. Enable it in Settings to
          use the planner views.
        </div>
      ) : (
        <ServicesScheduledList />
      )}
    </div>
  );
}
