"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "convex/react";
import {
  AssetFilters,
  type AssetFiltersState,
} from "@/components/assets/asset-filters";
import {
  AssetTable,
  type AssetSortBy,
  type AssetSortDirection,
} from "@/components/assets/asset-table";
import type {
  AssetFilterOptions,
  AssetListItem,
} from "@/components/assets/types";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/convex-api";

const DEFAULT_FILTERS: AssetFiltersState = {
  categoryId: null,
  status: null,
  locationId: null,
  tagIds: [],
};

export function AssetsPageClient() {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  const [filters, setFilters] = useState<AssetFiltersState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<AssetSortBy>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<AssetSortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filterOptions = useQuery(api.assets.getAssetFilterOptions, {});
  const assets = useQuery(api.assets.listAssets, {
    categoryId: filters.categoryId ?? undefined,
    status: filters.status ?? undefined,
    locationId: filters.locationId ?? undefined,
    tagIds: filters.tagIds,
    search: deferredSearch.trim() ? deferredSearch.trim() : undefined,
    sortBy,
    sortDirection,
  });

  const loading = assets === undefined || filterOptions === undefined;
  const rows = useMemo(() => (assets ?? []) as AssetListItem[], [assets]);
  const options = (filterOptions ?? {
    categories: [],
    locations: [],
    tags: [],
  }) as AssetFilterOptions;

  function handleSort(field: AssetSortBy) {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(field);
    setSortDirection(field === "createdAt" ? "desc" : "asc");
  }

  const selectedAssetNames = useMemo(() => {
    if (selectedIds.size === 0) {
      return [] as string[];
    }

    const selectedSet = selectedIds;
    return rows
      .filter((row) => selectedSet.has(row._id as string))
      .map((row) => row.name);
  }, [rows, selectedIds]);

  const selectedCount = selectedAssetNames.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Asset inventory
          </h2>
          <p className="text-sm text-muted-foreground">
            Filter and manage your assets from a single table view.
          </p>
        </div>

        <Button asChild className="cursor-pointer">
          <Link href="/assets/new">
            <Plus className="h-4 w-4" />
            Add asset
          </Link>
        </Button>
      </div>

      <AssetFilters
        options={options}
        search={searchInput}
        filters={filters}
        onSearchChange={(value) => {
          startTransition(() => {
            setSearchInput(value);
          });
        }}
        onFiltersChange={(nextFilters) => {
          startTransition(() => {
            setFilters(nextFilters);
          });
        }}
        onReset={() => {
          startTransition(() => {
            setSearchInput("");
            setFilters(DEFAULT_FILTERS);
          });
        }}
      />

      <AssetTable
        rows={rows}
        loading={loading}
        sortBy={sortBy}
        sortDirection={sortDirection}
        selectedIds={selectedIds}
        onSort={handleSort}
        onSelectRow={(assetId, checked) => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) {
              next.add(assetId);
            } else {
              next.delete(assetId);
            }
            return next;
          });
        }}
        onSelectAll={(checked) => {
          if (!checked) {
            setSelectedIds(new Set());
            return;
          }

          setSelectedIds(new Set(rows.map((row) => row._id as string)));
        }}
        onRowOpen={(assetId) => router.push(`/assets/${assetId}`)}
      />

      <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
        {selectedCount === 0 ? (
          <span>Select assets for future batch label actions.</span>
        ) : (
          <span>
            {selectedCount} selected:{" "}
            {selectedAssetNames.slice(0, 3).join(", ")}
            {selectedAssetNames.length > 3
              ? ` +${selectedAssetNames.length - 3} more`
              : ""}
          </span>
        )}
      </div>
    </div>
  );
}
