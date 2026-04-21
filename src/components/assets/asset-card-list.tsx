"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin, MoreHorizontal, Package } from "lucide-react";
import { AssetActionsSheet } from "@/components/assets/asset-actions-sheet";
import { StatusBadge } from "@/components/assets/status-badge";
import type { AssetListItem } from "@/components/assets/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAsset, type AssetDetail } from "@/lib/api/assets";
import { cn } from "@/lib/utils";

function rowToDetailPlaceholder(row: AssetListItem): AssetDetail {
  return {
    id: row.id,
    name: row.name,
    assetTag: row.assetTag,
    status: row.status,
    categoryId: row.categoryId,
    locationId: row.locationId,
    serviceGroupId: row.serviceGroupId,
    notes: row.notes,
    customFieldValues: {},
    createdBy: "",
    updatedBy: "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: null,
    location: row.locationPath
      ? {
          id: row.locationId ?? "",
          name: row.locationPath,
          parentId: null,
          path: row.locationPath,
        }
      : null,
    serviceGroup: null,
    tags: row.tagIds.map((id, index) => ({
      id,
      name: row.tagNames[index] ?? "",
      color: "",
    })),
  };
}

export function AssetCardList({
  rows,
  loading,
}: {
  rows: AssetListItem[];
  loading: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeRow = useMemo(
    () => (activeId ? (rows.find((row) => row.id === activeId) ?? null) : null),
    [rows, activeId],
  );

  const detailQuery = useQuery<AssetDetail | null>({
    queryKey: ["assets", "detail", activeId],
    queryFn: () => (activeId ? getAsset(activeId) : Promise.resolve(null)),
    enabled: !!activeId,
    // Seed the sheet from the list row so it opens instantly instead of
    // showing a blank closed state until the detail fetch completes. The
    // background refetch fills in fields the list row doesn't carry.
    placeholderData: activeRow ? rowToDetailPlaceholder(activeRow) : undefined,
  });

  if (loading && rows.length === 0) {
    return (
      <ul className="flex flex-col gap-2" data-testid="asset-card-list-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={`skeleton-${i}`}
            className="rounded-xl border border-border bg-card p-4"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/3" />
            <Skeleton className="mt-3 h-4 w-1/2" />
          </li>
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No assets match these filters"
        description="Adjust the filters or reset them to see results."
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2" data-testid="asset-card-list">
        {rows.map((row) => (
          <li key={row.id}>
            <AssetCard row={row} onMore={() => setActiveId(row.id)} />
          </li>
        ))}
      </ul>
      <AssetActionsSheet
        open={activeId !== null}
        asset={detailQuery.data ?? null}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
        onAssetUpdated={() => {
          // list invalidates via the nested mutations' query invalidation
        }}
        dismissLabel="Close ↓"
        testIdPrefix="asset"
      />
    </>
  );
}

function AssetCard({
  row,
  onMore,
}: {
  row: AssetListItem;
  onMore: () => void;
}) {
  const visibleTags = row.tagNames.slice(0, 3);
  const extraTagCount = Math.max(0, row.tagNames.length - visibleTags.length);

  return (
    <div
      className="relative rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
      data-testid={`asset-card-${row.id}`}
    >
      <Link
        href={`/assets/${row.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`Open ${row.name}`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {row.categoryColor ? (
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: row.categoryColor }}
              />
            ) : null}
            <p className="truncate text-sm font-semibold">{row.name}</p>
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {row.assetTag}
          </p>
          {row.locationPath ? (
            <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              <span className="truncate">{row.locationPath}</span>
            </p>
          ) : null}
          {visibleTags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleTags.map((name) => (
                <span
                  key={name}
                  className={cn(
                    "inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
                  )}
                >
                  {name}
                </span>
              ))}
              {extraTagCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  +{extraTagCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="relative flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={row.status} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Asset actions"
            data-testid={`asset-card-kebab-${row.id}`}
            className="relative -m-1 h-8 w-8 cursor-pointer"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMore();
            }}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
