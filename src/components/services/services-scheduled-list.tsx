"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LogServiceDialog } from "@/components/services/log-service-dialog";
import type { ScheduledServiceItem } from "@/components/services/types";
import { listScheduledAssets } from "@/lib/api/service-schedules";
import {
  formatDateFromIsoDateOnly,
  type AppDateFormat,
} from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

type ActiveTarget = {
  scheduleId: ScheduledServiceItem["scheduleId"];
  assetId: ScheduledServiceItem["assetId"];
  assetName: string;
};

type BucketKey = "overdue" | "thisWeek" | "thisMonth" | "upcoming";

const BUCKET_ORDER: BucketKey[] = [
  "overdue",
  "thisWeek",
  "thisMonth",
  "upcoming",
];

const BUCKET_LABELS: Record<BucketKey, string> = {
  overdue: "Overdue",
  thisWeek: "Due this week",
  thisMonth: "Due this month",
  upcoming: "Upcoming",
};

const BUCKET_ACCENTS: Record<BucketKey, string> = {
  overdue: "text-rose-700 dark:text-rose-300",
  thisWeek: "text-amber-700 dark:text-amber-300",
  thisMonth: "text-foreground",
  upcoming: "text-muted-foreground",
};

function daysBetween(fromIso: string, toIso: string) {
  const start = new Date(`${fromIso}T00:00:00Z`).getTime();
  const end = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function bucketForRow(row: ScheduledServiceItem, today: string): BucketKey {
  const diff = daysBetween(today, row.nextServiceDate);
  if (diff < 0) return "overdue";
  if (row.reminderStartDate > today) return "upcoming";
  if (diff <= 7) return "thisWeek";
  if (diff <= 30) return "thisMonth";
  return "upcoming";
}

function relativeDueDescription(
  nextServiceDate: string,
  today: string,
): string {
  const diff = daysBetween(today, nextServiceDate);
  if (diff < 0) {
    const overdue = Math.abs(diff);
    return `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
  }
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 7) return `Due in ${diff} days`;
  if (diff <= 30) {
    const weeks = Math.round(diff / 7);
    return `Due in ${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  const months = Math.round(diff / 30);
  return `Due in ${months} month${months === 1 ? "" : "s"}`;
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
  const grouped = useMemo(() => groupByBucket(items, today), [items, today]);

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
      <div className="space-y-3" data-testid="services-scheduled-list">
        {BUCKET_ORDER.map((bucket) => {
          const rows = grouped[bucket];
          if (rows.length === 0) return null;
          return (
            <ServicesGroupSection
              key={bucket}
              bucket={bucket}
              rows={rows}
              today={today}
              dateFormat={dateFormat}
              onLog={setActiveTarget}
            />
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

function groupByBucket(rows: ScheduledServiceItem[], today: string) {
  const groups: Record<BucketKey, ScheduledServiceItem[]> = {
    overdue: [],
    thisWeek: [],
    thisMonth: [],
    upcoming: [],
  };
  for (const row of rows) {
    groups[bucketForRow(row, today)].push(row);
  }
  return groups;
}

function ServicesGroupSection({
  bucket,
  rows,
  today,
  dateFormat,
  onLog,
}: {
  bucket: BucketKey;
  rows: ScheduledServiceItem[];
  today: string;
  dateFormat: AppDateFormat;
  onLog: (target: ActiveTarget) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border/70 bg-background shadow-sm"
      data-testid={`services-group-${bucket}`}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${BUCKET_ACCENTS[bucket]}`}>
            {BUCKET_LABELS[bucket]}
          </span>
          <Badge className="border border-border/60 bg-muted/30 text-xs text-muted-foreground">
            {rows.length}
          </Badge>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-2 border-t border-border/60 px-3 py-3">
          {rows.map((row) => (
            <li key={row.scheduleId}>
              <ScheduledServiceCard
                row={row}
                today={today}
                dateFormat={dateFormat}
                onLog={() =>
                  onLog({
                    scheduleId: row.scheduleId,
                    assetId: row.assetId,
                    assetName: row.assetName,
                  })
                }
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ScheduledServiceCard({
  row,
  today,
  dateFormat,
  onLog,
}: {
  row: ScheduledServiceItem;
  today: string;
  dateFormat: AppDateFormat;
  onLog: () => void;
}) {
  const status = getScheduleStatus({
    nextServiceDate: row.nextServiceDate,
    reminderStartDate: row.reminderStartDate,
    today,
  });
  const relative = relativeDueDescription(row.nextServiceDate, today);

  return (
    <article
      className={`rounded-lg border border-border/70 bg-card shadow-sm transition hover:border-primary/30 ${URGENCY_STRIPE[status]}`}
      data-testid={`scheduled-service-${row.scheduleId}`}
    >
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/assets/${row.assetId}`}
              className="truncate text-sm font-semibold tracking-tight hover:text-primary"
            >
              {row.assetName}
            </Link>
            <span className="font-mono text-xs text-muted-foreground">
              {row.assetTag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{relative}</span>
            <span> · </span>
            {formatDateFromIsoDateOnly(row.nextServiceDate, dateFormat)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={STATUS_CLASSNAMES[status]}>
              {STATUS_LABELS[status]}
            </Badge>
          </div>
          {row.lastServiceDate ? (
            <p className="text-xs text-muted-foreground">
              Last service{" "}
              {formatDateFromIsoDateOnly(row.lastServiceDate, dateFormat)}
              {row.lastServiceProviderName
                ? ` • ${row.lastServiceProviderName}`
                : ""}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer sm:self-start"
          onClick={onLog}
          data-testid={`log-service-${row.scheduleId}`}
        >
          Log service
        </Button>
      </div>
    </article>
  );
}
