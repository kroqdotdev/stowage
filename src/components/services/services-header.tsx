"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { MobileTitleCount } from "@/components/layout/mobile-top-bar";
import { bucketForRow } from "@/components/services/schedule-buckets";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";
import { useHydrated } from "@/hooks/use-hydrated";
import { getAppSettings } from "@/lib/api/app-settings";
import { listScheduledAssets } from "@/lib/api/service-schedules";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

/*
  Schedule views: the count next to the title is the number of scheduled
  services, so it only shows where that list is on screen.
*/
const SCHEDULE_PATHS = new Set(["/services", "/services/calendar"]);

/*
  One header for every Services section: counts from the schedule, then tabs.
  "Due this week" uses the same buckets as the Schedule list.
*/
export function ServicesHeader() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const showCount = SCHEDULE_PATHS.has(pathname);
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
      const bucket = bucketForRow(item, today);
      if (bucket === "overdue") overdue += 1;
      else if (bucket === "thisWeek") week += 1;
    }
    return { total: items.length, overdue, week };
  }, [items, today]);

  return (
    <>
      <PageHeader
        title="Services"
        count={showCount ? summary?.total : undefined}
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
      {summary && showCount ? (
        <MobileTitleCount count={summary.total} />
      ) : null}
      <ServicesNavTabs />
    </>
  );
}
