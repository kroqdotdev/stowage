"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { getDaysUntil } from "@/lib/date-format";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

type UpcomingRow = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  nextServiceDate: string;
};

function getUrgencyStripe(dateStr: string, todayIsoDate: string): string {
  const days = getDaysUntil(dateStr, todayIsoDate);
  if (days < 0) return "border-l-2 border-l-rose-600 dark:border-l-rose-500";
  if (days <= 3) return "border-l-2 border-l-amber-500 dark:border-l-amber-400";
  return "border-l-2 border-l-emerald-500 dark:border-l-emerald-400";
}

export function UpcomingServiceDue7DayCard() {
  const appSettings = useQuery(api.appSettings.getAppSettings, {});
  const rows = useQuery(api.serviceSchedules.listUpcomingServiceDueInDays, {
    days: 7,
  });
  const today = useTodayIsoDate();

  const items = useMemo(() => (rows ?? []) as UpcomingRow[], [rows]);

  if (appSettings === undefined || rows === undefined) {
    return (
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">
          Upcoming services (7 days)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </section>
    );
  }

  if (!appSettings.serviceSchedulingEnabled) {
    return (
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <h2 className="text-base font-semibold tracking-tight">
          Upcoming services (7 days)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Service scheduling is disabled.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          Upcoming services (7 days)
        </h2>
        <Link
          href="/services"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Open planner
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No assets due in the next 7 days.
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {items.map((row) => (
            <Link
              key={row.scheduleId}
              href={`/assets/${row.assetId}`}
              className={`block rounded-lg border border-border/70 px-3 py-2 transition hover:border-primary/30 ${getUrgencyStripe(row.nextServiceDate, today)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{row.assetName}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.assetTag}
                  </p>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {row.nextServiceDate}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
