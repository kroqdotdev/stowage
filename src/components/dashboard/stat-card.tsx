"use client";

import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  className,
  statKey,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  className: string;
  statKey: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border/70 p-4 shadow-sm ${className}`}
      data-dashboard-stat={statKey}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-70" />
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
          {label}
        </span>
      </div>
      <p
        className="mt-3 text-3xl font-semibold tracking-tight tabular-nums"
        data-dashboard-stat-value
      >
        {value}
      </p>
    </section>
  );
}
