"use client";

import {
  Archive,
  CheckCircle2,
  Package,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

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
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  {
    key: "in_storage" as const,
    label: "In Storage",
    icon: Archive,
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  {
    key: "under_repair" as const,
    label: "Under Repair",
    icon: Wrench,
    className:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  },
  {
    key: "retired" as const,
    label: "Retired",
    icon: XCircle,
    className:
      "bg-stone-100 text-stone-600 dark:bg-stone-800/40 dark:text-stone-400",
  },
  {
    key: "disposed" as const,
    label: "Disposed",
    icon: Trash2,
    className:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {statCards.map((card) => {
        const value = getValue(card.key);
        return (
          <StatCard
            key={card.key}
            statKey={card.key}
            label={card.label}
            value={value}
            icon={card.icon}
            className={card.className}
          />
        );
      })}
    </div>
  );
}
