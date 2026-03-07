"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Package, Plus, Printer, X } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";

function getInitialFilters(
  searchParams: URLSearchParams,
): AssetFiltersState {
  const category = searchParams.get("category");
  const location = searchParams.get("location");
  const tag = searchParams.get("tag");
  return {
    categoryId: category ? (category as Id<"categories">) : null,
    status: null,
    locationId: location ? (location as Id<"locations">) : null,
    tagIds: tag ? [tag as Id<"tags">] : [],
  };
}

function buildFiltersKey(searchParams: URLSearchParams) {
  return [
    searchParams.get("category") ?? "",
    searchParams.get("location") ?? "",
    searchParams.get("tag") ?? "",
  ].join("|");
}

function AssetsPageClientContent({
  initialFilters,
}: {
  initialFilters: AssetFiltersState;
}) {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  const [filters, setFilters] = useState<AssetFiltersState>(initialFilters);
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
  const hasFilters =
    Boolean(deferredSearch.trim()) ||
    filters.categoryId !== null ||
    filters.status !== null ||
    filters.locationId !== null ||
    filters.tagIds.length > 0;
  const showEmptyState = !loading && rows.length === 0 && !hasFilters;
  const options = (filterOptions ?? {
    categories: [],
    locations: [],
    tags: [],
    serviceGroups: [],
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
            setFilters({
              categoryId: null,
              status: null,
              locationId: null,
              tagIds: [],
            });
          });
        }}
      />

      {showEmptyState ? (
        <EmptyState
          icon={Package}
          title="No assets found"
          description="Get started by adding your first asset."
          action={
            <Button asChild className="cursor-pointer">
              <Link href="/assets/new">
                <Plus className="h-4 w-4" />
                Add asset
              </Link>
            </Button>
          }
        />
      ) : null}

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
        onRowEdit={(assetId) => router.push(`/assets/${assetId}/edit`)}
      />

      {selectedCount > 0 ? (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-3 shadow-lg">
          <div className="text-sm">
            <span className="font-medium">{selectedCount} selected</span>
            <span className="ml-2 text-muted-foreground">
              {selectedAssetNames.slice(0, 3).join(", ")}
              {selectedAssetNames.length > 3
                ? ` +${selectedAssetNames.length - 3} more`
                : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled
            >
              <Printer className="h-4 w-4" />
              Print labels
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
              Clear selection
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AssetsPageClient() {
  const searchParams = useSearchParams();
  const filtersKey = buildFiltersKey(searchParams);
  const initialFilters = useMemo(
    () => getInitialFilters(searchParams),
    [searchParams],
  );

  return (
    <AssetsPageClientContent
      key={filtersKey}
      initialFilters={initialFilters}
    />
  );
}
