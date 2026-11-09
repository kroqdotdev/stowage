"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { CrudModal } from "@/components/crud/modal";
import { ServiceRecordForm } from "@/components/services/service-record-form";
import { Button } from "@/components/ui/button";
import { describeDue } from "@/components/ui/due-tag";
import { Panel, PanelFooter } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppSettings } from "@/lib/api/app-settings";
import {
  getScheduleByAssetId,
  type ServiceIntervalUnit,
} from "@/lib/api/service-schedules";
import { formatDateFromIsoDateOnly, getDaysUntil } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";
import { cn } from "@/lib/utils";

function unitLabel(value: number, unit: ServiceIntervalUnit) {
  const singular = unit.slice(0, -1);
  return value === 1 ? singular : unit;
}

export function formatInterval(value: number, unit: ServiceIntervalUnit) {
  return value === 1 ? `Every ${unitLabel(1, unit)}` : `Every ${value} ${unit}`;
}

export function formatReminder(value: number, unit: ServiceIntervalUnit) {
  if (value <= 0) return "On the day";
  return `${value} ${unitLabel(value, unit)} before`;
}

/*
  Next service: the one card on the asset page with a primary action. The
  big line is the due distance (red once overdue), then the service plan and
  date, then interval and reminder as label/value rows.
*/
export function NextServicePanel({
  assetId,
  assetName,
  serviceGroupName,
  className,
}: {
  assetId: string;
  assetName: string;
  serviceGroupName: string | null;
  className?: string;
}) {
  const dateFormat = useAppDateFormat();
  const today = useTodayIsoDate();
  const [logOpen, setLogOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60_000,
  });
  const scheduleQuery = useQuery({
    queryKey: ["service-schedules", "by-asset", assetId],
    queryFn: () => getScheduleByAssetId(assetId),
  });

  const schedulingEnabled =
    settingsQuery.data?.serviceSchedulingEnabled ?? true;
  // Whether logging completes the schedule or adds a plain record depends on
  // both queries, so wait for them; otherwise the form would remount and
  // switch modes mid-entry.
  const settled = !settingsQuery.isPending && !scheduleQuery.isPending;
  const schedule = schedulingEnabled ? (scheduleQuery.data ?? null) : null;
  const due = schedule
    ? describeDue(getDaysUntil(schedule.nextServiceDate, today))
    : null;

  return (
    <Panel className={className} data-testid="next-service-panel">
      <div className="px-[18px] pt-4 pb-3.5">
        <div className="eyebrow mb-1.5">Next service</div>
        {!settled ? (
          <div className="space-y-2.5 py-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-44" />
          </div>
        ) : schedule && due ? (
          <>
            <div
              className={cn(
                "wide text-[22px] leading-tight font-bold",
                due.tone === "overdue" ? "text-destructive" : "text-foreground",
              )}
            >
              {due.long}
            </div>
            <div className="mt-1 text-sm text-ink-2">
              {serviceGroupName ? `${serviceGroupName} · ` : null}
              {formatDateFromIsoDateOnly(schedule.nextServiceDate, dateFormat)}
            </div>
            <dl className="mt-3.5 text-sm">
              <div className="flex justify-between gap-4 border-t border-border py-2">
                <dt className="text-ink-2">Interval</dt>
                <dd className="font-semibold text-foreground">
                  {formatInterval(
                    schedule.intervalValue,
                    schedule.intervalUnit,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-2">
                <dt className="text-ink-2">Reminder</dt>
                <dd className="font-semibold text-foreground">
                  {formatReminder(
                    schedule.reminderLeadValue,
                    schedule.reminderLeadUnit,
                  )}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="wide text-lg leading-tight font-bold text-foreground">
              Not scheduled
            </div>
            <p className="mt-1 text-sm text-ink-2">
              {schedulingEnabled
                ? "Set an interval to get reminders before it is due."
                : "Service scheduling is turned off in Settings."}
            </p>
          </>
        )}
      </div>
      <PanelFooter className="grid grid-cols-2 gap-2.5 py-3.5">
        <Button
          type="button"
          onClick={() => setLogOpen(true)}
          disabled={!settled}
        >
          <Check />
          Log service…
        </Button>
        {schedulingEnabled ? (
          <Button asChild variant="outline">
            <Link href={`/assets/${assetId}/edit#service`}>
              {schedule ? "Reschedule…" : "Schedule…"}
            </Link>
          </Button>
        ) : null}
      </PanelFooter>

      <CrudModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title={`Log service: ${assetName}`}
        description={
          schedule
            ? "Completing it moves the next service on by one interval."
            : "Adds an entry to this asset's service history."
        }
      >
        {logOpen ? (
          <ServiceRecordForm
            key={schedule ? `complete-${schedule.id}` : `create-${assetId}`}
            assetId={assetId}
            mode={schedule ? "complete" : "create"}
            scheduleId={schedule?.id ?? null}
          />
        ) : null}
      </CrudModal>
    </Panel>
  );
}
