"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogServiceDialog } from "@/components/services/log-service-dialog";
import type { ScheduledServiceItem } from "@/components/services/types";
import { listScheduledAssets } from "@/lib/api/service-schedules";
import { formatDateFromIsoDateOnly } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

type ActiveTarget = {
  scheduleId: ScheduledServiceItem["scheduleId"];
  assetId: ScheduledServiceItem["assetId"];
  assetName: string;
};

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

function getDaysOverdue(nextServiceDate: string, today: string) {
  if (nextServiceDate >= today) {
    return 0;
  }

  const start = new Date(`${nextServiceDate}T00:00:00Z`).getTime();
  const end = new Date(`${today}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
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
    "border-rose-300/80 bg-rose-500/10 text-rose-800 dark:border-rose-700/60 dark:text-rose-300",
  due_soon:
    "border-amber-300/80 bg-amber-500/10 text-amber-800 dark:border-amber-700/60 dark:text-amber-300",
  scheduled:
    "border-emerald-300/80 bg-emerald-500/10 text-emerald-800 dark:border-emerald-700/60 dark:text-emerald-300",
};

const URGENCY_STRIPE: Record<ReturnType<typeof getScheduleStatus>, string> = {
  overdue: "border-l-4 border-l-rose-600 dark:border-l-rose-500",
  due_soon: "border-l-4 border-l-amber-500 dark:border-l-amber-400",
  scheduled: "border-l-4 border-l-emerald-500 dark:border-l-emerald-400",
};

export function ServicesScheduledList() {
  const dateFormat = useAppDateFormat();
  const rowsQuery = useQuery({
    queryKey: ["service-schedules", "scheduled"],
    queryFn: listScheduledAssets,
  });
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);

  const today = useTodayIsoDate();
  const items = useMemo(
    () => (rowsQuery.data ?? []) as ScheduledServiceItem[],
    [rowsQuery.data],
  );

  if (rowsQuery.isPending) {
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
    <>
      <div className="space-y-3">
        {items.map((row) => {
          const status = getScheduleStatus({
            nextServiceDate: row.nextServiceDate,
            reminderStartDate: row.reminderStartDate,
            today,
          });
          const daysOverdue = getDaysOverdue(row.nextServiceDate, today);

          return (
            <article
              key={row.scheduleId}
              className={`rounded-xl border border-border/70 bg-background shadow-sm transition hover:border-primary/30 ${URGENCY_STRIPE[status]}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="space-y-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/assets/${row.assetId}`}
                        className="text-sm font-semibold tracking-tight hover:text-primary"
                      >
                        {row.assetName}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.assetTag}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Due:{" "}
                      {formatDateFromIsoDateOnly(
                        row.nextServiceDate,
                        dateFormat,
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={STATUS_CLASSNAMES[status]}>
                      {STATUS_LABELS[status]}
                    </Badge>
                    {daysOverdue > 0 ? (
                      <Badge className="bg-rose-500/10 text-rose-800 dark:text-rose-300">
                        {daysOverdue} day{daysOverdue === 1 ? "" : "s"} overdue
                      </Badge>
                    ) : null}
                  </div>

                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {row.lastServiceDate ? (
                      <p>
                        Last service{" "}
                        {formatDateFromIsoDateOnly(
                          row.lastServiceDate,
                          dateFormat,
                        )}
                        {row.lastServiceProviderName
                          ? ` • ${row.lastServiceProviderName}`
                          : ""}
                      </p>
                    ) : (
                      <p>No previous service record</p>
                    )}
                    {row.lastServiceDescription ? (
                      <p className="line-clamp-2">
                        {row.lastServiceDescription}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setActiveTarget({
                        scheduleId: row.scheduleId,
                        assetId: row.assetId,
                        assetName: row.assetName,
                      })
                    }
                  >
                    Log service
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <LogServiceDialog
        open={activeTarget !== null}
        assetId={activeTarget?.assetId ?? null}
        assetName={activeTarget?.assetName ?? null}
        scheduleId={activeTarget?.scheduleId ?? null}
        onClose={() => setActiveTarget(null)}
      />
    </>
  );
}
