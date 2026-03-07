import { Badge } from "@/components/ui/badge";
import {
  ASSET_STATUS_LABELS,
  type AssetStatus,
} from "@/components/assets/types";
import { cn } from "@/lib/utils";

const STATUS_CLASS_NAME: Record<AssetStatus, string> = {
  active:
    "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
  in_storage:
    "border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200",
  under_repair:
    "border-orange-300/70 bg-orange-100 text-orange-900 dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-200",
  retired:
    "border-stone-300/70 bg-stone-100 text-stone-700 dark:border-stone-400/30 dark:bg-stone-500/15 dark:text-stone-300",
  disposed:
    "border-rose-300/70 bg-rose-100 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AssetStatus;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "border text-xs font-medium",
        STATUS_CLASS_NAME[status],
        className,
      )}
    >
      {ASSET_STATUS_LABELS[status]}
    </Badge>
  );
}
