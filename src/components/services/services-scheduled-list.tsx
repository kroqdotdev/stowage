"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/convex-api";

type ScheduledRow = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  assetStatus:
    | "active"
    | "in_storage"
    | "under_repair"
    | "retired"
    | "disposed";
  nextServiceDate: string;
  reminderStartDate: string;
};

function getTodayIsoDate() {
  const now = new Date();
  const year = String(now.getUTCFullYear()).padStart(4, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getScheduleStatus({
  nextServiceDate,
  reminderStartDate,
  today,
}: {
  nextServiceDate: string;
  reminderStartDate: string;
  today: string;
}) {
  if (nextServiceDate < today) {
    return "overdue" as const;
  }

  if (reminderStartDate <= today) {
    return "due_soon" as const;
  }

  return "scheduled" as const;
}

const STATUS_LABELS: Record<ReturnType<typeof getScheduleStatus>, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  scheduled: "Scheduled",
};

const STATUS_CLASSNAMES: Record<
  ReturnType<typeof getScheduleStatus>,
  string
> = {
  overdue:
    "border-red-300/80 bg-red-500/10 text-red-700 dark:border-red-700/60 dark:text-red-300",
  due_soon:
    "border-amber-300/80 bg-amber-500/10 text-amber-700 dark:border-amber-700/60 dark:text-amber-300",
  scheduled:
    "border-emerald-300/80 bg-emerald-500/10 text-emerald-700 dark:border-emerald-700/60 dark:text-emerald-300",
};

export function ServicesScheduledList() {
  const rows = useQuery(api.serviceSchedules.listScheduledAssets, {});

  const today = getTodayIsoDate();

  const items = useMemo(() => (rows ?? []) as ScheduledRow[], [rows]);

  if (rows === undefined) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-5 text-sm text-muted-foreground">
        Loading schedules...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
        No scheduled assets yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((row) => {
        const status = getScheduleStatus({
          nextServiceDate: row.nextServiceDate,
          reminderStartDate: row.reminderStartDate,
          today,
        });

        return (
          <article
            key={row.scheduleId}
            className="rounded-xl border border-border/70 bg-background px-4 py-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  {row.assetName}
                </p>
                <p className="text-xs text-muted-foreground">{row.assetTag}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_CLASSNAMES[status]}>
                  {STATUS_LABELS[status]}
                </Badge>
                <p className="text-sm font-medium">{row.nextServiceDate}</p>
                <Link
                  href={`/assets/${row.assetId}`}
                  className="text-sm text-primary underline-offset-2 hover:underline"
                >
                  Open asset
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
