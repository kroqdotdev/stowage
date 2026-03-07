"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { LogServiceDialog } from "@/components/services/log-service-dialog";
import type { ScheduledServiceItem } from "@/components/services/types";
import { api } from "@/lib/convex-api";
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

  return [...leadingSlots, ...monthDays];
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
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function ServicesCalendarMonth() {
  const [state, setState] = useState<MonthState>(getInitialMonthState);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);
  const rows = useQuery(api.serviceSchedules.listCalendarMonth, {
    year: state.year,
    month: state.month,
  });

  const items = useMemo(() => (rows ?? []) as ScheduledServiceItem[], [rows]);
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
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          {monthLabel(state)}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => setState((previous) => shiftMonth(previous, -1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => setState((previous) => shiftMonth(previous, 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div key={dayName} className="px-1 py-1">
            {dayName}
          </div>
        ))}
      </div>

      {rows === undefined ? (
        <div className="rounded-xl border border-border/70 bg-background p-5 text-sm text-muted-foreground">
          Loading calendar...
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-24 rounded-lg border border-transparent"
                />
              );
            }

            const dateKey = toIsoDate({
              year: state.year,
              month: state.month,
              day,
            });
            const dayRows = rowsByDate.get(dateKey) ?? [];
            const isToday = dateKey === today;

            return (
              <div
                key={dateKey}
                className={`min-h-28 rounded-lg border p-2 ${
                  isToday
                    ? "border-primary/50 bg-orange-50/50 dark:bg-stone-800/50"
                    : "border-border/70 bg-background"
                }`}
              >
                <p
                  className={`text-xs font-medium ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {day}
                </p>
                <div className="mt-2 space-y-1.5">
                  {dayRows.slice(0, 3).map((row) => (
                    <button
                      key={row.scheduleId}
                      type="button"
                      className="block w-full rounded bg-primary/10 px-1.5 py-1 text-left text-xs text-foreground transition hover:bg-primary/20"
                      onClick={() =>
                        setActiveTarget({
                          scheduleId: row.scheduleId,
                          assetId: row.assetId,
                          assetName: row.assetName,
                        })
                      }
                    >
                      <span className="font-medium">{row.assetTag}</span>
                      {row.lastServiceDate ? (
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          Last {row.lastServiceDate}
                        </span>
                      ) : null}
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
