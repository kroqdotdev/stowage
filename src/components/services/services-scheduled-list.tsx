"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { CrudModal } from "@/components/crud/modal";
import { ServiceRecordDynamicForm } from "@/components/services/service-record-dynamic-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

type ScheduledRow = {
  scheduleId: Id<"serviceSchedules">;
  assetId: Id<"assets">;
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
  const rows = useQuery(api.serviceSchedules.listScheduledAssets, {});
  const [activeRecordTarget, setActiveRecordTarget] = useState<{
    assetId: Id<"assets">;
    assetName: string;
    nextServiceDate: string;
  } | null>(null);

  const today = useTodayIsoDate();

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
    <>
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
              className={`rounded-xl border border-border/70 bg-background shadow-sm transition hover:border-primary/30 ${URGENCY_STRIPE[status]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
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
                      Due: {row.nextServiceDate}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_CLASSNAMES[status]}>
                    {STATUS_LABELS[status]}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setActiveRecordTarget({
                        assetId: row.assetId,
                        assetName: row.assetName,
                        nextServiceDate: row.nextServiceDate,
                      })
                    }
                  >
                    Log record
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <CrudModal
        open={activeRecordTarget !== null}
        onClose={() => setActiveRecordTarget(null)}
        title={
          activeRecordTarget
            ? `Log service record: ${activeRecordTarget.assetName}`
            : "Log service record"
        }
        description="Complete required service fields and optionally attach service reports."
      >
        {activeRecordTarget ? (
          <ServiceRecordDynamicForm
            assetId={activeRecordTarget.assetId}
            scheduledForDate={activeRecordTarget.nextServiceDate}
          />
        ) : null}
      </CrudModal>
    </>
  );
}
