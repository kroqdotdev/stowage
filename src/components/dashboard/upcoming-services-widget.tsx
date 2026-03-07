"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Id } from "@/lib/convex-api";
import type { AppDateFormat } from "@/lib/date-format";
import { formatDateFromIsoDateOnly, getDaysUntil } from "@/lib/date-format";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

type UpcomingServiceItem = {
  scheduleId: Id<"serviceSchedules">;
  assetId: Id<"assets">;
  assetName: string;
  assetTag: string;
  nextServiceDate: string;
};

function getQueueAccent(dateStr: string, todayIsoDate: string) {
  const daysUntil = getDaysUntil(dateStr, todayIsoDate);
  if (daysUntil < 0) {
    return "border-l-2 border-l-rose-600 bg-rose-50/50 dark:border-l-rose-500 dark:bg-rose-950/20";
  }

  if (daysUntil <= 3) {
    return "border-l-2 border-l-amber-500 bg-amber-50/50 dark:border-l-amber-400 dark:bg-amber-950/20";
  }

  return "border-l-2 border-l-emerald-500 bg-emerald-50/40 dark:border-l-emerald-400 dark:bg-emerald-950/10";
}

function getDueLabel(dateStr: string, todayIsoDate: string) {
  const daysUntil = getDaysUntil(dateStr, todayIsoDate);
  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} overdue`;
  }

  if (daysUntil === 0) {
    return "Due today";
  }

  if (daysUntil === 1) {
    return "Due tomorrow";
  }

  return `Due in ${daysUntil} days`;
}

export function UpcomingServicesWidget({
  items,
  overdueCount,
  serviceSchedulingEnabled,
  dateFormat,
}: {
  items: UpcomingServiceItem[];
  overdueCount: number;
  serviceSchedulingEnabled: boolean;
  dateFormat: AppDateFormat;
}) {
  const today = useTodayIsoDate();

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Service queue
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Earliest due assets across the schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/70 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCount} overdue
            </span>
          ) : null}
          <Link
            href="/services"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Open planner
          </Link>
        </div>
      </div>

      {!serviceSchedulingEnabled ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Service scheduling is disabled.
        </p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No scheduled services yet.
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.scheduleId}
              href={`/assets/${item.assetId}`}
              className={`block rounded-xl border border-border/70 px-3 py-3 transition-colors hover:border-primary/30 ${getQueueAccent(item.nextServiceDate, today)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.assetName}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {item.assetTag}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getDueLabel(item.nextServiceDate, today)}
                  </p>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {formatDateFromIsoDateOnly(item.nextServiceDate, dateFormat)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
