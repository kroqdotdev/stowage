"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";

type UpcomingRow = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  nextServiceDate: string;
};

export function UpcomingServiceDue7DayCard() {
  const appSettings = useQuery(api.appSettings.getAppSettings, {});
  const rows = useQuery(api.serviceSchedules.listUpcomingServiceDueInDays, {
    days: 7,
  });

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
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
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
        <div className="mt-3 space-y-2">
          {items.map((row) => (
            <article
              key={row.scheduleId}
              className="rounded-lg border border-border/70 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{row.assetName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.assetTag}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{row.nextServiceDate}</p>
                  <Link
                    href={`/assets/${row.assetId}`}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    View asset
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
