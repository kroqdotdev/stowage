"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { MobileTitleCount } from "@/components/layout/mobile-top-bar";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { useHydrated } from "@/hooks/use-hydrated";
import { getAppSettings } from "@/lib/api/app-settings";
import { listScheduledAssets } from "@/lib/api/service-schedules";
import { getDaysUntil } from "@/lib/date-format";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

/* One header for every Services section: counts from the schedule, then tabs. */
export function ServicesHeader() {
  const hydrated = useHydrated();
  const today = useTodayIsoDate();
  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60_000,
  });
  const enabled = settingsQuery.data?.serviceSchedulingEnabled ?? false;
  const scheduledQuery = useQuery({
    queryKey: ["service-schedules", "scheduled"],
    queryFn: listScheduledAssets,
    enabled,
  });

  const items = hydrated && enabled ? scheduledQuery.data : undefined;
  const summary = useMemo(() => {
    if (!items) return null;
    let overdue = 0;
    let week = 0;
    for (const item of items) {
      const days = getDaysUntil(item.nextServiceDate, today);
      if (days < 0) overdue += 1;
      else if (days <= 7) week += 1;
    }
    return { total: items.length, overdue, week };
  }, [items, today]);

  return (
    <>
      <PageHeader
        title="Services"
        count={summary?.total}
        className="max-md:hidden"
        description={
          summary
            ? [
                summary.overdue > 0 ? `${summary.overdue} overdue` : null,
                `${summary.week} due this week`,
                `${summary.total} scheduled`,
              ]
                .filter(Boolean)
                .join(" · ")
            : " "
        }
      />
      {summary ? <MobileTitleCount count={summary.total} /> : null}
      <ServicesNavTabs />
    </>
  );
}
