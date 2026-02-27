import { Badge } from "@/components/ui/badge"
import { ASSET_STATUS_LABELS, type AssetStatus } from "@/components/assets/types"
import { cn } from "@/lib/utils"

const STATUS_CLASS_NAME: Record<AssetStatus, string> = {
  active:
    "border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
  in_storage:
    "border-slate-300/70 bg-slate-100 text-slate-900 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-200",
  under_repair:
    "border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200",
  retired:
    "border-violet-300/70 bg-violet-100 text-violet-900 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200",
  disposed:
    "border-rose-300/70 bg-rose-100 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200",
}

export function StatusBadge({
  status,
  className,
}: {
  status: AssetStatus
  className?: string
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
  )
}
