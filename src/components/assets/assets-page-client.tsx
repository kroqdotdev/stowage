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
  useSyncExternalStore,
} from "react";
import { ChevronLeft, ChevronRight, Package, Plus, Printer, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  AssetFilters,
  EMPTY_FILTERS,
  type AssetFiltersState,
} from "@/components/assets/asset-filters";
import { AssetFiltersMobile } from "@/components/assets/asset-filters-mobile";
import { AssetCardList } from "@/components/assets/asset-card-list";
import {
  AssetTable,
  type AssetSortBy,
  type AssetSortDirection,
} from "@/components/assets/asset-table";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetFilterOptions,
  type AssetListItem,
  type AssetStatus,
} from "@/components/assets/types";
import { PageHeader } from "@/components/layout/page-header";
import { MobileTitleCount } from "@/components/layout/mobile-top-bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getAssetFilterOptions,
  listAssets,
  type ListAssetsParams,
} from "@/lib/api/assets";
import { getDashboardOverview } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;
const HINT_KEY = "stowage:hint-long-press";
const noopSubscribe = () => () => {};

function parseStatus(value: string | null): AssetStatus | null {
  return value && (ASSET_STATUS_OPTIONS as readonly string[]).includes(value)
    ? (value as AssetStatus)
    : null;
}

function getInitialFilters(searchParams: URLSearchParams): AssetFiltersState {
  return {
    ...EMPTY_FILTERS,
    categoryId: searchParams.get("category"),
    status: parseStatus(searchParams.get("status")),
    locationId: searchParams.get("location"),
    tagIds: searchParams.get("tag") ? [searchParams.get("tag") as string] : [],
  };
}

function buildFiltersKey(searchParams: URLSearchParams) {
  return [
    searchParams.get("category") ?? "",
    searchParams.get("status") ?? "",
    searchParams.get("location") ?? "",
    searchParams.get("tag") ?? "",
  ].join("|");
}

function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push("gap");
    out.push(page);
  });
  return out;
}

export function AssetsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPhone = useMediaQuery("(max-width: 767px)");
  // The shell fetches the overview before this suspended page hydrates; keep
  // cached data out of the hydration render so it matches the server HTML.
  const hydrated = useHydrated();

  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  const [filters, setFilters] = useState<AssetFiltersState>(() =>
    getInitialFilters(searchParams),
  );
  const [sortBy, setSortBy] = useState<AssetSortBy>("updatedAt");
  const [sortDirection, setSortDirection] = useState<AssetSortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [phoneVisible, setPhoneVisible] = useState(PAGE_SIZE);
  const [hintDismissedNow, setHintDismissedNow] = useState(false);
  const hintStored = useSyncExternalStore(
    noopSubscribe,
    () => window.localStorage.getItem(HINT_KEY) === "1",
    () => true,
  );
  const hintDismissed = hintStored || hintDismissedNow;

  // Sync URL → state when the filter-defining params change (for example a
  // category link on the dashboard), without remounting the table.
  const lastFiltersKeyRef = useRef(buildFiltersKey(searchParams));
  useEffect(() => {
    const nextKey = buildFiltersKey(searchParams);
    if (nextKey === lastFiltersKeyRef.current) return;
    lastFiltersKeyRef.current = nextKey;
    startTransition(() => {
      setFilters(getInitialFilters(searchParams));
      setSelectedIds(new Set());
      setPage(1);
    });
  }, [searchParams]);

  const filterOptionsQuery = useQuery({
    queryKey: ["assets", "filter-options"],
    queryFn: getAssetFilterOptions,
    staleTime: 60_000,
  });
  const overviewQuery = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
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

  const loading = !hydrated || assetsQuery.isPending || filterOptionsQuery.isPending;
  const listData = hydrated ? assetsQuery.data : undefined;
  const rows = useMemo(() => {
    const all = (listData ?? []) as AssetListItem[];
    if (!filters.serviceGroupId) return all;
    return all.filter((row) => row.serviceGroupId === filters.serviceGroupId);
  }, [listData, filters.serviceGroupId]);

  const hasFilters =
    Boolean(deferredSearch.trim()) ||
    filters.categoryId !== null ||
    filters.status !== null ||
    filters.locationId !== null ||
    filters.tagIds.length > 0 ||
    Boolean(filters.serviceGroupId);
  const showEmptyState = !loading && rows.length === 0 && !hasFilters;
  const options: AssetFilterOptions = (hydrated ? filterOptionsQuery.data : undefined) ?? {
    categories: [],
    locations: [],
    tags: [],
    serviceGroups: [],
  };

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const phoneRows = rows.slice(0, phoneVisible);

  function updateFilters(next: AssetFiltersState) {
    startTransition(() => {
      setFilters(next);
      setPage(1);
      setPhoneVisible(PAGE_SIZE);
    });
  }

  function resetFilters() {
    startTransition(() => {
      setSearchInput("");
      setFilters(EMPTY_FILTERS);
      setPage(1);
    });
  }

  function handleSort(field: AssetSortBy) {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDirection(field === "createdAt" || field === "updatedAt" ? "desc" : "asc");
  }

  const selectedAssetIds = useMemo(() => Array.from(selectedIds.values()), [selectedIds]);
  const selectedCount = rows.filter((row) => selectedIds.has(row.id)).length;
  const printHref = useMemo(() => {
    if (selectedAssetIds.length === 0) return "/labels/print";
    const params = new URLSearchParams({ assetIds: selectedAssetIds.join(",") });
    return `/labels/print?${params.toString()}`;
  }, [selectedAssetIds]);

  const overview = hydrated ? overviewQuery.data : undefined;
  const counts = overview?.statusCounts;
  const total = overview?.totalAssets;
  const subline = overview
    ? [
        `${overview.statusCounts.active} active`,
        overview.statusCounts.under_repair > 0
          ? `${overview.statusCounts.under_repair} under repair`
          : null,
        overview.serviceSchedulingEnabled && overview.overdueServiceCount > 0
          ? `${overview.overdueServiceCount} overdue`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : " ";

  const tabs: { value: AssetStatus | null; label: string; count?: number }[] = [
    { value: null, label: "All" },
    ...ASSET_STATUS_OPTIONS.map((status) => ({
      value: status,
      label: ASSET_STATUS_LABELS[status],
      count: counts?.[status],
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Assets"
        count={total}
        description={subline}
        className="max-md:hidden"
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={printHref}>
                <Printer />
                Print labels…
              </Link>
            </Button>
            <Button asChild>
              <Link href="/assets/new">
                <Plus />
                New asset…
              </Link>
            </Button>
          </>
        }
      />
      {total !== undefined ? <MobileTitleCount count={total} /> : null}

      <nav aria-label="Status" className="mb-5 flex gap-0.5 overflow-x-auto max-md:hidden">
        {tabs.map((tab) => {
          const active = filters.status === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => updateFilters({ ...filters, status: tab.value })}
              className={cn(
                "inline-flex cursor-pointer items-center gap-[7px] border-b-[3px] border-transparent px-3 pt-2 pb-2.5 text-sm font-medium whitespace-nowrap text-ink-2 hover:text-foreground",
                active && "border-amber-ink font-semibold text-foreground",
              )}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <b className={cn("font-mono text-[13px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {tab.count}
                </b>
              ) : null}
            </button>
          );
        })}
      </nav>

      {isPhone ? (
        <>
          <AssetFiltersMobile
            options={options}
            search={searchInput}
            filters={filters}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSearchChange={(value) => startTransition(() => setSearchInput(value))}
            onFiltersChange={updateFilters}
            onSortChange={(nextSortBy, nextDirection) => {
              setSortBy(nextSortBy);
              setSortDirection(nextDirection);
            }}
            onReset={resetFilters}
          />
          {!hintDismissed && rows.length > 0 ? (
            <div className="-mt-1.5 mb-2.5 flex items-center justify-between px-0.5 text-[13px] text-muted-foreground">
              <span>Press and hold an asset for quick actions.</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => {
                  window.localStorage.setItem(HINT_KEY, "1");
                  setHintDismissedNow(true);
                }}
                className="grid size-7 cursor-pointer place-items-center"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <AssetFilters
          options={options}
          search={searchInput}
          filters={filters}
          onSearchChange={(value) => startTransition(() => setSearchInput(value))}
          onFiltersChange={updateFilters}
          onReset={resetFilters}
        />
      )}

      {showEmptyState ? (
        <EmptyState
          icon={Package}
          title="No assets yet."
          description="Add your first asset and print its label."
          action={
            <Button asChild>
              <Link href="/assets/new">
                <Plus />
                New asset…
              </Link>
            </Button>
          }
        />
      ) : isPhone ? (
        <>
          <AssetCardList rows={phoneRows} loading={loading} />
          {rows.length > 0 ? (
            <div className="mt-3 space-y-2.5 text-center text-sm text-ink-2">
              <div>
                1 to {phoneRows.length} of {rows.length}
              </div>
              {phoneRows.length < rows.length ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setPhoneVisible((n) => n + PAGE_SIZE)}
                >
                  Show {Math.min(PAGE_SIZE, rows.length - phoneRows.length)} more
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <AssetTable
            rows={pageRows}
            loading={loading}
            sortBy={sortBy}
            sortDirection={sortDirection}
            selectedIds={selectedIds}
            onSort={handleSort}
            onSelectRow={(assetId, checked) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(assetId);
                else next.delete(assetId);
                return next;
              });
            }}
            onSelectAll={(checked) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const row of pageRows) {
                  if (checked) next.add(row.id);
                  else next.delete(row.id);
                }
                return next;
              });
            }}
            onRowOpen={(assetId) => router.push(`/assets/${assetId}`)}
            onRowEdit={(assetId) => router.push(`/assets/${assetId}/edit`)}
          />
          {rows.length > 0 ? (
            <div className="flex items-center gap-4 border-t border-border px-3.5 py-3 text-[13px] text-ink-2">
              <span>
                {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              {pageCount > 1 ? (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="grid size-8 cursor-pointer place-items-center rounded-md border-[1.5px] border-input bg-card text-foreground disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {pageList(currentPage, pageCount).map((entry, index) =>
                    entry === "gap" ? (
                      <span key={`gap-${index}`} className="px-1 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <button
                        key={entry}
                        type="button"
                        aria-current={entry === currentPage ? "page" : undefined}
                        onClick={() => setPage(entry)}
                        className={cn(
                          "h-8 min-w-8 cursor-pointer px-2 text-[13px] font-semibold text-foreground",
                          entry === currentPage && "font-bold shadow-[inset_0_-3px_0_var(--amber-ink)]",
                        )}
                      >
                        {entry}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                    className="grid size-8 cursor-pointer place-items-center rounded-md border-[1.5px] border-input bg-card text-foreground disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {selectedCount > 0 && !isPhone ? (
        <div
          role="region"
          aria-label="Selection"
          className="on-charcoal fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-md bg-sidebar py-2 pr-2.5 pl-4 text-sm text-white shadow-[0_12px_32px_rgba(0,0,0,.28)] md:left-[calc(88px+(100vw-88px)/2)] lg:left-[calc(252px+(100vw-252px)/2)]"
        >
          <b className="mr-1 font-semibold">{selectedCount} selected</b>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white bg-transparent text-white hover:bg-sidebar-accent"
          >
            <Link href={printHref}>
              <Printer />
              Print labels…
            </Link>
          </Button>
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => setSelectedIds(new Set())}
            className="grid size-8 cursor-pointer place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
