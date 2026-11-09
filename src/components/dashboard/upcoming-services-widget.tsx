"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { AppDateFormat } from "@/lib/date-format";
import { formatDateFromIsoDateOnly, getDaysUntil } from "@/lib/date-format";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";
import { SheetFoot, SheetHeading } from "@/components/ui/sheet-heading";
import { TagChip } from "@/components/ui/tag-chip";
import { DueTag } from "@/components/ui/due-tag";
import { EmptyState } from "@/components/ui/empty-state";

type UpcomingServiceItem = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  nextServiceDate: string;
};

/*
  Service due: a sheet on the concrete. Each row is the tag chip and the
  asset name, the scheduled date under it, and the due marker at the right
  (red tag when overdue, bold ink within 48 hours, plain text after). The list
  closes with a quiet line where you land.
*/
export function UpcomingServicesWidget({
  items,
  overdueCount,
  scheduledCount,
  serviceSchedulingEnabled,
  dateFormat,
}: {
  items: UpcomingServiceItem[];
  overdueCount: number;
  scheduledCount?: number;
  serviceSchedulingEnabled: boolean;
  dateFormat: AppDateFormat;
}) {
  const today = useTodayIsoDate();
  const more = Math.max(0, (scheduledCount ?? items.length) - items.length);

  return (
    <section aria-labelledby="service-due-heading">
      <SheetHeading title={<span id="service-due-heading">Service due</span>} />

      {!serviceSchedulingEnabled ? (
        <EmptyState
          title="Service scheduling is disabled."
          description="Turn it on in Settings to track service dates."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No scheduled services yet."
          description="Add a service schedule to an asset to see it here."
        />
      ) : (
        <>
          <ul>
            {items.map((item) => {
              const days = getDaysUntil(item.nextServiceDate, today);
              return (
                <li key={item.scheduleId} className="border-b border-border">
                  <Link
                    href={`/assets/${item.assetId}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-0.5 py-[11px] hover:bg-card/60"
                  >
                    <TagChip weight="table" className="row-span-2 self-center">
                      {item.assetTag}
                    </TagChip>
                    <b className="truncate text-sm font-semibold text-foreground">
                      {item.assetName}
                    </b>
                    <DueTag days={days} className="row-span-2 self-center max-md:row-span-1" />
                    <span className="text-sm text-ink-2">
                      {formatDateFromIsoDateOnly(item.nextServiceDate, dateFormat)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <SheetFoot>
            {overdueCount > 0 ? <span>{overdueCount} overdue · </span> : null}
            {more > 0 ? <span>{more} more scheduled · </span> : null}
            <Link href="/services">See all services</Link>
          </SheetFoot>
        </>
      )}
    </section>
  );
}
