"use client";

import {
  Package,
  CheckCircle2,
  Archive,
  Wrench,
  XCircle,
} from "lucide-react";

type StatusCounts = {
  active: number;
  in_storage: number;
  under_repair: number;
  retired: number;
  disposed: number;
};

const statCards = [
  {
    key: "total" as const,
    label: "Total Assets",
    icon: Package,
    className: "bg-accent text-accent-foreground",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  {
    key: "in_storage" as const,
    label: "In Storage",
    icon: Archive,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  {
    key: "under_repair" as const,
    label: "Under Repair",
    icon: Wrench,
    className: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  },
  {
    key: "retired" as const,
    label: "Retired",
    icon: XCircle,
    className: "bg-stone-100 text-stone-600 dark:bg-stone-800/40 dark:text-stone-400",
  },
] as const;

export function DashboardStatsBar({
  totalAssets,
  statusCounts,
}: {
  totalAssets: number;
  statusCounts: StatusCounts;
}) {
  function getValue(key: "total" | keyof StatusCounts) {
    if (key === "total") return totalAssets;
    return statusCounts[key];
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = getValue(card.key);
        return (
          <div
            key={card.key}
            className={`rounded-xl border border-border/70 p-4 shadow-sm ${card.className}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 opacity-70" />
              <span className="text-xs font-medium uppercase tracking-wide opacity-70">
                {card.label}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        );
      })}
    </div>
  );
}
