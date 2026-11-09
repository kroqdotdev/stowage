import * as React from "react";

import {
  ASSET_STATUS_LABELS,
  type AssetStatus,
} from "@/components/assets/types";
import { cn } from "@/lib/utils";

/*
  Status colour only on exceptions. Active is plain ink-2 text with no
  marker; the exceptions carry a 9px square marker in their colour. In
  tables the marker keeps a fixed gutter so every label shares one left
  edge, and Active recedes to ink-3 so the exceptions carry the column.
*/
export const STATUS_COLOR: Record<AssetStatus, string> = {
  active: "text-ink-2",
  in_storage: "text-slate",
  under_repair: "text-repair",
  retired: "text-retired",
  disposed: "text-disposed",
};

export function StatusText({
  status,
  className,
  inTable = false,
  hideActive = false,
  ...props
}: React.ComponentProps<"span"> & {
  status: AssetStatus;
  inTable?: boolean;
  hideActive?: boolean;
}) {
  const isActive = status === "active";
  if (isActive && hideActive) return null;

  return (
    <span
      data-slot="status-text"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-[7px] text-sm font-medium whitespace-nowrap",
        STATUS_COLOR[status],
        isActive && inTable && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-[9px] shrink-0 rounded-xs bg-current",
          isActive && (inTable ? "invisible" : "hidden"),
        )}
      />
      {ASSET_STATUS_LABELS[status]}
    </span>
  );
}
