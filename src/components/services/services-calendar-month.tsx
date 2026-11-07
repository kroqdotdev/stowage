"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LogServiceDialog } from "@/components/services/log-service-dialog";
import type { ScheduledServiceItem } from "@/components/services/types";
import { listCalendarMonth } from "@/lib/api/service-schedules";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

type MonthState = {
  year: number;
  month: number;
};

type ActiveTarget = {
  scheduleId: ScheduledServiceItem["scheduleId"];
  assetId: ScheduledServiceItem["assetId"];
  assetName: string;
};

function getInitialMonthState(): MonthState {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
}

function shiftMonth(state: MonthState, delta: number): MonthState {
  const candidate = new Date(Date.UTC(state.year, state.month - 1 + delta, 1));
  return {
    year: candidate.getUTCFullYear(),
    month: candidate.getUTCMonth() + 1,
  };
}

function buildCalendarDays({ year, month }: MonthState) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const leadingSlots = Array.from({ length: startWeekday }, () => null);
  const monthDays = Array.from(
    { length: daysInMonth },
    (_, index) => index + 1,
  );

  const trailing = (7 - ((leadingSlots.length + monthDays.length) % 7)) % 7;
  return [...leadingSlots, ...monthDays, ...Array.from({ length: trailing }, () => null)];
}

function toIsoDate({
  year,
  month,
  day,
}: {
  year: number;
  month: number;
  day: number;
}) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthLabel({ year, month }: MonthState) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function ServicesCalendarMonth() {
  const [state, setState] = useState<MonthState>(getInitialMonthState);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);
  const rowsQuery = useQuery({
    queryKey: ["service-schedules", "calendar", state.year, state.month],
    queryFn: () => listCalendarMonth(state.year, state.month),
  });

  const items = useMemo(
    () => (rowsQuery.data ?? []) as ScheduledServiceItem[],
    [rowsQuery.data],
  );
  const rowsByDate = useMemo(() => {
    const map = new Map<string, ScheduledServiceItem[]>();
    for (const row of items) {
      const existing = map.get(row.nextServiceDate) ?? [];
      existing.push(row);
      map.set(row.nextServiceDate, existing);
    }
    return map;
  }, [items]);

  const days = useMemo(() => buildCalendarDays(state), [state]);
  const today = useTodayIsoDate();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          data-testid="calendar-month-heading"
          className="wide text-xl font-bold text-foreground"
        >
          {monthLabel(state)}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => setState((previous) => shiftMonth(previous, -1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => setState((previous) => shiftMonth(previous, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="grid grid-cols-7 rule-ink text-[13px] font-semibold text-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
            <div key={dayName} className="px-2 py-2 md:px-2.5">
              <span className="md:hidden">{dayName.slice(0, 1)}</span>
              <span className="max-md:hidden">{dayName}</span>
            </div>
          ))}
        </div>

        {rowsQuery.isPending ? (
          <div className="space-y-3 p-5" aria-busy="true">
            <span className="sr-only">Loading calendar...</span>
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const edge = cn(
                "border-b border-border",
                index % 7 !== 6 && "border-r",
              );
              if (!day) {
                return <div key={`empty-${index}`} className={cn(edge, "min-h-16 bg-secondary/50 md:min-h-28")} />;
              }

              const dateKey = toIsoDate({
                year: state.year,
                month: state.month,
                day,
              });
              const dayRows = rowsByDate.get(dateKey) ?? [];
              const isToday = dateKey === today;
              const overdue = dateKey < today;

              return (
                <div
                  key={dateKey}
                  data-testid="calendar-day-cell"
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    edge,
                    "min-h-16 min-w-0 p-1 md:min-h-28 md:p-2",
                    isToday && "shadow-[inset_0_3px_0_var(--amber-ink)]",
                  )}
                >
                  <p
                    className={cn(
                      "font-mono text-[13px] font-medium",
                      isToday ? "font-bold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {day}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {dayRows.slice(0, 3).map((row) => (
                      <button
                        key={row.scheduleId}
                        type="button"
                        aria-label={`Log service for ${row.assetTag}, ${row.assetName}`}
                        title={row.assetName}
                        className={cn(
                          "block w-full cursor-pointer truncate rounded-xs border px-1 py-0.5 text-left font-mono text-[11px] font-semibold tracking-[0.02em] md:px-1.5 md:text-xs",
                          overdue
                            ? "border-destructive bg-destructive text-white"
                            : "border-foreground bg-card text-foreground hover:bg-secondary",
                        )}
                        onClick={() =>
                          setActiveTarget({
                            scheduleId: row.scheduleId,
                            assetId: row.assetId,
                            assetName: row.assetName,
                          })
                        }
                      >
                        {row.assetTag}
                      </button>
                    ))}
                    {dayRows.length > 3 ? (
                      <p className="text-[11px] text-muted-foreground">
                        +{dayRows.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <LogServiceDialog
        open={activeTarget !== null}
        assetId={activeTarget?.assetId ?? null}
        assetName={activeTarget?.assetName ?? null}
        scheduleId={activeTarget?.scheduleId ?? null}
        onClose={() => setActiveTarget(null)}
      />
    </section>
  );
}
