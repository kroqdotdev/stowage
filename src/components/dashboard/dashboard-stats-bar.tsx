"use client";

import { StatStrip } from "@/components/ui/stat-strip";

type StatusCounts = {
  active: number;
  in_storage: number;
  under_repair: number;
  retired: number;
  disposed: number;
};

/*
  The dashboard stat strip: assets, overdue services, then the two exception
  statuses people act on, and retired. Counts carry colour only when non-zero
  and the status is an exception.
*/
export function DashboardStatsBar({
  totalAssets,
  statusCounts,
  overdueCount,
}: {
  totalAssets: number;
  statusCounts: StatusCounts;
  overdueCount: number;
}) {
  return (
    <div data-testid="dashboard-stats-bar">
      <StatStrip
        items={[
          {
            key: "total",
            label: "Assets",
            value: totalAssets,
            href: "/assets",
          },
          {
            key: "overdue",
            label: "Overdue",
            value: overdueCount,
            tone: "danger",
            href: "/services",
          },
          {
            key: "under_repair",
            label: "Under repair",
            shortLabel: "In repair",
            value: statusCounts.under_repair,
            tone: "repair",
            href: "/assets?status=under_repair",
          },
          {
            key: "in_storage",
            label: "In storage",
            shortLabel: "Stored",
            value: statusCounts.in_storage,
            tone: "slate",
            href: "/assets?status=in_storage",
          },
          {
            key: "retired",
            label: "Retired",
            value: statusCounts.retired,
            href: "/assets?status=retired",
          },
        ]}
      />
    </div>
  );
}
