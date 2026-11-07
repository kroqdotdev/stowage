"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { AssetActionsSheet } from "@/components/assets/asset-actions-sheet";
import type { AssetListItem } from "@/components/assets/types";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusText } from "@/components/ui/status-text";
import { TagChip } from "@/components/ui/tag-chip";
import { LocationPath } from "@/components/locations/location-path";
import { useLongPress } from "@/hooks/use-long-press";
import { getAsset, type AssetDetail } from "@/lib/api/assets";
import { formatRelativeTime } from "@/lib/relative-time";

function rowToDetailPlaceholder(row: AssetListItem): AssetDetail {
  const tags =
    row.tagIds.length === row.tagNames.length
      ? row.tagIds.map((id, index) => ({
          id,
          name: row.tagNames[index] ?? "",
          color: "",
        }))
      : [];

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
    tags,
  };
}

/*
  Phone list: stacked cards on one card surface. Line one is the tag chip and
  the name; line two is "path · time" on every row; exception statuses take a
  13px third line. Press and hold a card for quick actions.
*/
export function AssetCardList({
  rows,
  loading,
  secondary = "location",
}: {
  rows: AssetListItem[];
  loading: boolean;
  /* What line two leads with; inside one location the category says more. */
  secondary?: "location" | "category";
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
    placeholderData: activeRow ? rowToDetailPlaceholder(activeRow) : undefined,
  });

  if (loading && rows.length === 0) {
    return (
      <ul
        className="rounded-md border border-border bg-card"
        data-testid="asset-card-list-loading"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={`skeleton-${i}`}
            className="flex items-start gap-2.5 border-b border-border px-3.5 py-3 last:border-b-0"
          >
            <span className="block h-[23px] w-[70px] shrink-0 rounded-xs border border-line-2" />
            <div className="flex-1 space-y-2 pt-1.5">
              <span className="block h-2.5 w-2/3 rounded-full bg-border" />
              <span className="block h-2.5 w-1/3 rounded-full bg-border" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No assets match these filters."
        description="Clear a filter or try fewer words."
      />
    );
  }

  return (
    <>
      <ul
        className="rounded-md border border-border bg-card"
        data-testid="asset-card-list"
      >
        {rows.map((row) => (
          <li key={row.id} className="border-b border-border last:border-b-0">
            <AssetCard row={row} secondary={secondary} onActions={() => setActiveId(row.id)} />
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
        dismissLabel="Close"
        testIdPrefix="asset"
      />
    </>
  );
}

function AssetCard({
  row,
  secondary,
  onActions,
}: {
  row: AssetListItem;
  secondary: "location" | "category";
  onActions: () => void;
}) {
  const router = useRouter();
  const { handlers, consumeClick } = useLongPress(onActions);
  const time = formatRelativeTime(row.updatedAt);

  return (
    <a
      href={`/assets/${row.id}`}
      data-testid={`asset-card-${row.id}`}
      aria-label={`${row.assetTag}, ${row.name}`}
      className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 px-3.5 py-2.5 select-none active:bg-secondary [-webkit-touch-callout:none]"
      {...handlers}
      onClick={(event) => {
        event.preventDefault();
        if (consumeClick()) return;
        router.push(`/assets/${row.id}`);
      }}
    >
      <TagChip weight="table">{row.assetTag}</TagChip>
      <span className="truncate text-[15px] leading-snug font-semibold text-foreground">
        {row.name}
      </span>
      <span className="col-start-2 flex min-w-0 items-baseline text-sm whitespace-nowrap">
        {secondary === "category" ? (
          <span className="truncate text-ink-2">{row.categoryName ?? "No category"}</span>
        ) : (
          <LocationPath path={row.locationPath} compact />
        )}
        <span className="shrink-0 whitespace-pre text-muted-foreground">
          {" · "}
          {time.short}
        </span>
      </span>
      {row.status !== "active" ? (
        <StatusText status={row.status} className="col-start-2 text-[13px]" />
      ) : null}
    </a>
  );
}
