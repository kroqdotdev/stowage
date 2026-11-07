"use client";

import { useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetFilterOptions,
} from "@/components/assets/types";
import type {
  AssetSortBy,
  AssetSortDirection,
} from "@/components/assets/asset-table";
import type { AssetFiltersState } from "@/components/assets/asset-filters";
import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function countActiveFilters(
  filters: AssetFiltersState,
  search: string,
): number {
  return (
    (search.trim() ? 1 : 0) +
    (filters.categoryId ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.locationId ? 1 : 0) +
    filters.tagIds.length
  );
}

export function AssetFiltersMobile({
  options,
  search,
  filters,
  sortBy,
  sortDirection,
  onSearchChange,
  onFiltersChange,
  onSortChange,
  onReset,
}: {
  options: AssetFilterOptions;
  search: string;
  filters: AssetFiltersState;
  sortBy: AssetSortBy;
  sortDirection: AssetSortDirection;
  onSearchChange: (value: string) => void;
  onFiltersChange: (next: AssetFiltersState) => void;
  onSortChange: (sortBy: AssetSortBy, direction: AssetSortDirection) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters, search);

  return (
    <div className="mb-3.5" data-testid="asset-filters-mobile">
      <div className="flex items-center gap-2">
        <label className="relative flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md border-[1.5px] border-foreground bg-card px-3.5">
          <span className="eyebrow shrink-0">Status</span>
          <select
            value={filters.status ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: (event.target.value || null) as AssetFiltersState["status"],
              })
            }
            aria-label="Filter by status"
            data-testid="asset-filters-mobile-status"
            className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-6 text-sm font-semibold text-foreground outline-none"
          >
            <option value="">All</option>
            {ASSET_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 size-3.5 text-foreground" aria-hidden="true" />
        </label>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Filters"
          title="Filters"
          className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-md border-[1.5px] border-foreground bg-card text-foreground"
          data-testid="asset-filters-mobile-trigger"
        >
          <SlidersHorizontal className="size-[18px]" />
          {activeCount > 0 ? (
            <span
              className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-md bg-foreground px-1 font-mono text-xs font-semibold text-background"
              data-testid="asset-filters-mobile-count"
            >
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>
      {search.trim() ? (
        <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-2">
          Searching for <b className="font-semibold text-foreground">“{search.trim()}”</b>
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="cursor-pointer font-medium underline underline-offset-[3px]"
          >
            Clear
          </button>
        </div>
      ) : null}

      <AssetFiltersSheet
        open={open}
        onOpenChange={setOpen}
        options={options}
        filters={filters}
        sortBy={sortBy}
        sortDirection={sortDirection}
        search={search}
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        onSortChange={onSortChange}
        onReset={() => {
          onReset();
          setOpen(false);
        }}
      />
    </div>
  );
}

function AssetFiltersSheet({
  open,
  onOpenChange,
  options,
  filters,
  sortBy,
  sortDirection,
  search,
  onSearchChange,
  onFiltersChange,
  onSortChange,
  onReset,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: AssetFilterOptions;
  filters: AssetFiltersState;
  sortBy: AssetSortBy;
  sortDirection: AssetSortDirection;
  onFiltersChange: (next: AssetFiltersState) => void;
  onSortChange: (sortBy: AssetSortBy, direction: AssetSortDirection) => void;
  onReset: () => void;
}) {
  return (
    <MobileActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filters"
    >
      <div
        className="flex max-h-[70svh] flex-col gap-4 overflow-auto"
        data-testid="asset-filters-sheet"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, tag or serial"
            className="h-11 pl-9"
            aria-label="Search assets"
            data-testid="asset-filters-mobile-search"
          />
        </div>
        <Section title="Sort by">
          <SortRow
            active={sortBy === "updatedAt" && sortDirection === "desc"}
            label="Recently updated"
            onClick={() => onSortChange("updatedAt", "desc")}
            testId="asset-sort-updated"
          />
          <SortRow
            active={sortBy === "createdAt" && sortDirection === "desc"}
            label="Recently added"
            onClick={() => onSortChange("createdAt", "desc")}
            testId="asset-sort-recent"
          />
          <SortRow
            active={sortBy === "name" && sortDirection === "asc"}
            label="Name (A→Z)"
            onClick={() => onSortChange("name", "asc")}
            testId="asset-sort-name"
          />
          <SortRow
            active={sortBy === "assetTag" && sortDirection === "asc"}
            label="Asset tag"
            onClick={() => onSortChange("assetTag", "asc")}
            testId="asset-sort-tag"
          />
          <SortRow
            active={sortBy === "status" && sortDirection === "asc"}
            label="Status"
            onClick={() => onSortChange("status", "asc")}
            testId="asset-sort-status"
          />
        </Section>

        <Section title="Status">
          <OptionPill
            active={filters.status === null}
            label="All"
            onClick={() => onFiltersChange({ ...filters, status: null })}
            testId="asset-filter-status-all"
          />
          {ASSET_STATUS_OPTIONS.map((status) => (
            <OptionPill
              key={status}
              active={filters.status === status}
              label={ASSET_STATUS_LABELS[status]}
              onClick={() => onFiltersChange({ ...filters, status })}
              testId={`asset-filter-status-${status}`}
            />
          ))}
        </Section>

        {options.categories.length > 0 ? (
          <Section title="Category">
            <OptionPill
              active={filters.categoryId === null}
              label="All"
              onClick={() => onFiltersChange({ ...filters, categoryId: null })}
              testId="asset-filter-category-all"
            />
            {options.categories.map((category) => (
              <OptionPill
                key={category.id}
                active={filters.categoryId === category.id}
                label={category.name}
                onClick={() =>
                  onFiltersChange({ ...filters, categoryId: category.id })
                }
                testId={`asset-filter-category-${category.id}`}
              />
            ))}
          </Section>
        ) : null}

        {options.locations.length > 0 ? (
          <Section title="Location">
            <LocationList
              options={options}
              selectedId={filters.locationId}
              onChange={(locationId) =>
                onFiltersChange({ ...filters, locationId })
              }
            />
          </Section>
        ) : null}

        {options.tags.length > 0 ? (
          <Section title="Keywords">
            {options.tags.map((tag) => {
              const active = filters.tagIds.includes(tag.id);
              return (
                <OptionPill
                  key={tag.id}
                  active={active}
                  label={tag.name}
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      tagIds: active
                        ? filters.tagIds.filter((id) => id !== tag.id)
                        : [...filters.tagIds, tag.id],
                    })
                  }
                  testId={`asset-filter-tag-${tag.id}`}
                />
              );
            })}
          </Section>
        ) : null}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          onClick={onReset}
          data-testid="asset-filters-mobile-reset"
        >
          <X className="h-4 w-4" />
          Reset filters
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1 bg-foreground text-background hover:bg-foreground/90"
          onClick={() => onOpenChange(false)}
          data-testid="asset-filters-mobile-apply"
        >
          Show assets
        </Button>
      </div>
    </MobileActionSheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="eyebrow">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function OptionPill({
  active,
  label,
  dotColor,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  dotColor?: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border-[1.5px] px-3 text-sm font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-input bg-card text-foreground hover:bg-secondary",
      )}
    >
      {dotColor ? (
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      ) : null}
      {label}
      {active ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
    </button>
  );
}

function SortRow({
  active,
  label,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      className={cn(
        "h-9 cursor-pointer rounded-md border-[1.5px] px-3 text-sm font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-input bg-card text-foreground hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}

function LocationList({
  options,
  selectedId,
  onChange,
}: {
  options: AssetFilterOptions;
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <ul
      className="w-full max-h-56 overflow-auto rounded-md border border-border"
      data-testid="asset-filter-location-list"
    >
      <li>
        <button
          type="button"
          onClick={() => onChange(null)}
          data-testid="asset-filter-location-all"
          aria-pressed={selectedId === null}
          className={cn(
            "flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0",
            selectedId === null
              ? "bg-secondary font-semibold text-foreground shadow-[inset_3px_0_0_var(--foreground)]"
              : "hover:bg-secondary",
          )}
        >
          All locations
        </button>
      </li>
      {options.locations.map((loc) => {
        const active = selectedId === loc.id;
        return (
          <li key={loc.id}>
            <button
              type="button"
              onClick={() => onChange(loc.id)}
              data-testid={`asset-filter-location-${loc.id}`}
              aria-pressed={active}
              className={cn(
                "flex w-full flex-col border-b border-border px-3 py-2 text-left last:border-b-0",
                active
                  ? "bg-secondary font-semibold shadow-[inset_3px_0_0_var(--foreground)]"
                  : "hover:bg-secondary",
              )}
            >
              <span className="text-sm font-medium">{loc.name}</span>
              <span className="text-xs text-muted-foreground">{loc.path}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
