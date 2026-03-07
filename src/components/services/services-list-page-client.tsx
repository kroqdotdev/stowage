"use client";

import { useQuery } from "convex/react";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { ServicesScheduledList } from "@/components/services/services-scheduled-list";
import { api } from "@/lib/convex-api";

export function ServicesListPageClient() {
  const appSettings = useQuery(api.appSettings.getAppSettings, {});

  if (appSettings === undefined) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading services planner...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ServicesNavTabs />
      {!appSettings.serviceSchedulingEnabled ? (
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
