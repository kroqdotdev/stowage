"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DueTag } from "@/components/ui/due-tag";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusText } from "@/components/ui/status-text";
import { TagChip } from "@/components/ui/tag-chip";
import { LogServiceDialog } from "@/components/services/log-service-dialog";
import type { ScheduledServiceItem } from "@/components/services/types";
import { listScheduledAssets } from "@/lib/api/service-schedules";
import {
  formatDateFromIsoDateOnly,
  getDaysUntil,
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

const BUCKET_ORDER: BucketKey[] = ["overdue", "thisWeek", "thisMonth", "upcoming"];

const BUCKET_LABELS: Record<BucketKey, string> = {
  overdue: "Overdue",
  thisWeek: "Due this week",
  thisMonth: "Due this month",
  upcoming: "Later",
};

function bucketForRow(row: ScheduledServiceItem, today: string): BucketKey {
  const diff = getDaysUntil(row.nextServiceDate, today);
  if (diff < 0) return "overdue";
  if (row.reminderStartDate > today) return "upcoming";
  if (diff <= 7) return "thisWeek";
  if (diff <= 30) return "thisMonth";
  return "upcoming";
}

function groupByBucket(rows: ScheduledServiceItem[], today: string) {
  const groups: Record<BucketKey, ScheduledServiceItem[]> = {
    overdue: [],
    thisWeek: [],
    thisMonth: [],
    upcoming: [],
  };
  for (const row of rows) groups[bucketForRow(row, today)].push(row);
  for (const list of Object.values(groups)) {
    list.sort((a, b) => a.nextServiceDate.localeCompare(b.nextServiceDate));
  }
  return groups;
}

/*
  The service schedule as sheets on the concrete, one per due bucket, most
  urgent first. A row is the tag, the asset, its last service, the date and
  the due tag (red filled when overdue), then "Log service…".
*/
export function ServicesScheduledList() {
  const dateFormat = useAppDateFormat();
  const today = useTodayIsoDate();
  const rowsQuery = useQuery({
    queryKey: ["service-schedules", "scheduled"],
    queryFn: listScheduledAssets,
  });
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);

  const items = useMemo(
    () => (rowsQuery.data ?? []) as ScheduledServiceItem[],
    [rowsQuery.data],
  );
  const grouped = useMemo(() => groupByBucket(items, today), [items, today]);

  if (rowsQuery.isPending) {
    return (
      <div className="space-y-4 py-2" aria-busy="true">
        <span className="sr-only">Loading schedules...</span>
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-2.5 w-2/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No scheduled assets yet."
        description="Give an asset a service interval and it shows up here before it is due."
        action={
          <Button asChild variant="outline">
            <Link href="/assets">Open Assets</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-8" data-testid="services-scheduled-list">
        {BUCKET_ORDER.map((bucket) => {
          const rows = grouped[bucket];
          if (rows.length === 0) return null;
          return (
            <section key={bucket} data-testid={`services-group-${bucket}`}>
              <SheetHeading title={BUCKET_LABELS[bucket]} count={rows.length} />
              <ul>
                {rows.map((row) => (
                  <ScheduledServiceRow
                    key={row.scheduleId}
                    row={row}
                    today={today}
                    dateFormat={dateFormat}
                    onLog={() =>
                      setActiveTarget({
                        scheduleId: row.scheduleId,
                        assetId: row.assetId,
                        assetName: row.assetName,
                      })
                    }
                  />
                ))}
              </ul>
            </section>
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

function ScheduledServiceRow({
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
  const days = getDaysUntil(row.nextServiceDate, today);
  const last = row.lastServiceDate
    ? `Last ${formatDateFromIsoDateOnly(row.lastServiceDate, dateFormat)}${
        row.lastServiceProviderName ? ` by ${row.lastServiceProviderName}` : ""
      }`
    : "Never serviced";

  return (
    <li
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border px-0.5 py-3 md:grid-cols-[auto_minmax(0,1fr)_110px_150px_auto]"
      data-testid={`scheduled-service-${row.scheduleId}`}
    >
      <TagChip weight="table" className="max-md:self-start">
        {row.assetTag}
      </TagChip>
      <div className="min-w-0">
        <Link
          href={`/assets/${row.assetId}`}
          className="block truncate text-sm font-semibold text-foreground hover:underline hover:underline-offset-[3px]"
        >
          {row.assetName}
        </Link>
        <span className="mt-0.5 flex items-center gap-2 md:hidden">
          <DueTag days={days} />
          <span className="text-[13px] text-ink-2">
            {formatDateFromIsoDateOnly(row.nextServiceDate, dateFormat)}
          </span>
        </span>
        <span className="block truncate text-[13px] text-muted-foreground">
          {last}
          {row.assetStatus !== "active" ? (
            <>
              {" · "}
              <StatusText status={row.assetStatus} className="text-[13px]" />
            </>
          ) : null}
        </span>
      </div>
      <span className="text-sm whitespace-nowrap text-ink-2 max-md:hidden">
        {formatDateFromIsoDateOnly(row.nextServiceDate, dateFormat)}
      </span>
      <DueTag days={days} className="justify-self-start max-md:hidden" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onLog}
        data-testid={`log-service-${row.scheduleId}`}
        aria-label={`Log service for ${row.assetName}`}
      >
        <span className="md:hidden">Log…</span>
        <span className="max-md:hidden">Log service…</span>
      </Button>
    </li>
  );
}
