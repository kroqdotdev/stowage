"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ServiceGroupAsset } from "@/components/services/types";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusText } from "@/components/ui/status-text";
import { TagChip } from "@/components/ui/tag-chip";
import { listServiceGroupAssets } from "@/lib/api/service-groups";

/* The plan's assets as a sheet: tag, name, status (exceptions only). */
export function ServiceGroupAssetsPanel({ groupId }: { groupId: string }) {
  const rowsQuery = useQuery({
    queryKey: ["service-groups", groupId, "assets"],
    queryFn: () => listServiceGroupAssets(groupId),
  });
  const assets = useMemo(
    () => (rowsQuery.data ?? []) as ServiceGroupAsset[],
    [rowsQuery.data],
  );

  return (
    <section>
      <SheetHeading
        title="Assets on this plan"
        count={rowsQuery.isPending ? undefined : assets.length}
      />
      {rowsQuery.isPending ? (
        <div className="space-y-3 py-4" aria-busy="true">
          <span className="sr-only">Loading assets...</span>
          <Skeleton className="h-2.5 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      ) : assets.length === 0 ? (
        <p className="px-0.5 py-4 text-sm text-ink-2">
          No assets are on this plan yet. Choose the plan when you edit an
          asset.
        </p>
      ) : (
        <ul data-testid="service-group-assets-card-list">
          {assets.map((asset) => (
            <li key={asset.id} data-testid={`service-group-asset-card-${asset.id}`}>
              <Link
                href={`/assets/${asset.id}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-0.5 py-3 hover:bg-card/60"
              >
                <TagChip weight="table">{asset.assetTag}</TagChip>
                <span className="truncate text-sm font-semibold text-foreground">
                  {asset.name}
                </span>
                <StatusText status={asset.status} hideActive className="text-[13px]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
