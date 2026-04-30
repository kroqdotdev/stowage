"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Package, Plus, Printer, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  AssetFilters,
  type AssetFiltersState,
} from "@/components/assets/asset-filters";
import { AssetFiltersMobile } from "@/components/assets/asset-filters-mobile";
import { AssetCardList } from "@/components/assets/asset-card-list";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getAssetFilterOptions,
  listAssets,
  type ListAssetsParams,
} from "@/lib/api/assets";

function getInitialFilters(searchParams: URLSearchParams): AssetFiltersState {
  return {
    categoryId: searchParams.get("category"),
    status: null,
    locationId: searchParams.get("location"),
    tagIds: searchParams.get("tag") ? [searchParams.get("tag") as string] : [],
  };
}

function buildFiltersKey(searchParams: URLSearchParams) {
  return [
    searchParams.get("category") ?? "",
    searchParams.get("location") ?? "",
    searchParams.get("tag") ?? "",
  ].join("|");
}

export function AssetsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  const [filters, setFilters] = useState<AssetFiltersState>(() =>
    getInitialFilters(searchParams),
  );
  const [sortBy, setSortBy] = useState<AssetSortBy>("createdAt");
  const [sortDirection, setSortDirection] =
    useState<AssetSortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync URL → state when the filter-defining params actually change (e.g.,
  // clicking a category pill on the dashboard). Previously the wrapper used
  // `key={filtersKey}` to remount the entire subtree, which blew away the
  // table, in-flight queries, selection, and sort — a visible jank when the
  // user navigated between pre-filtered links.
  const lastFiltersKeyRef = useRef(buildFiltersKey(searchParams));
  useEffect(() => {
    const nextKey = buildFiltersKey(searchParams);
    if (nextKey === lastFiltersKeyRef.current) return;
    lastFiltersKeyRef.current = nextKey;
    startTransition(() => {
      setFilters(getInitialFilters(searchParams));
      setSelectedIds(new Set());
    });
  }, [searchParams]);

  const filterOptionsQuery = useQuery({
    queryKey: ["assets", "filter-options"],
    queryFn: getAssetFilterOptions,
    staleTime: 60_000,
  });

  const listParams: ListAssetsParams = useMemo(
    () => ({
      categoryId: filters.categoryId ?? undefined,
      status: filters.status ?? undefined,
      locationId: filters.locationId ?? undefined,
      tagIds: filters.tagIds,
      search: deferredSearch.trim() ? deferredSearch.trim() : undefined,
      sortBy,
      sortDirection,
    }),
    [
      filters.categoryId,
      filters.status,
      filters.locationId,
      filters.tagIds,
      deferredSearch,
      sortBy,
      sortDirection,
    ],
  );
  const assetsQuery = useQuery({
    queryKey: ["assets", "list", listParams],
    queryFn: () => listAssets(listParams),
  });

  const loading = assetsQuery.isPending || filterOptionsQuery.isPending;
  const rows = useMemo(
    () => (assetsQuery.data ?? []) as AssetListItem[],
    [assetsQuery.data],
  );
  const hasFilters =
    Boolean(deferredSearch.trim()) ||
    filters.categoryId !== null ||
    filters.status !== null ||
    filters.locationId !== null ||
    filters.tagIds.length > 0;
  const showEmptyState = !loading && rows.length === 0 && !hasFilters;
  const options: AssetFilterOptions = filterOptionsQuery.data ?? {
    categories: [],
    locations: [],
    tags: [],
    serviceGroups: [],
  };

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
    return rows.filter((row) => selectedSet.has(row.id)).map((row) => row.name);
  }, [rows, selectedIds]);

  const selectedCount = selectedAssetNames.length;
  const selectedAssetIds = useMemo(
    () => Array.from(selectedIds.values()),
    [selectedIds],
  );
  const printHref = useMemo(() => {
    if (selectedAssetIds.length === 0) {
      return "/labels/print";
    }

    const params = new URLSearchParams({
      assetIds: selectedAssetIds.join(","),
    });
    return `/labels/print?${params.toString()}`;
  }, [selectedAssetIds]);

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

      {isDesktop ? (
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
      ) : (
        <AssetFiltersMobile
          options={options}
          search={searchInput}
          filters={filters}
          sortBy={sortBy}
          sortDirection={sortDirection}
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
          onSortChange={(nextSortBy, nextDirection) => {
            setSortBy(nextSortBy);
            setSortDirection(nextDirection);
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
      )}

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

      {isDesktop ? (
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

            setSelectedIds(new Set(rows.map((row) => row.id)));
          }}
          onRowOpen={(assetId) => router.push(`/assets/${assetId}`)}
          onRowEdit={(assetId) => router.push(`/assets/${assetId}/edit`)}
        />
      ) : (
        <AssetCardList rows={rows} loading={loading} />
      )}

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
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
            >
              <Link href={printHref}>
                <Printer className="h-4 w-4" />
                Print labels
              </Link>
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
