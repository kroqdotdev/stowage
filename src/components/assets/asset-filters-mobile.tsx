"use client";

import { useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-2" data-testid="asset-filters-mobile">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search assets"
            className="pl-9"
            aria-label="Search assets"
            data-testid="asset-filters-mobile-search"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="relative cursor-pointer gap-2"
          data-testid="asset-filters-mobile-trigger"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <Badge
              className="ml-1 h-5 min-w-5 rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground"
              data-testid="asset-filters-mobile-count"
            >
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      <AssetFiltersSheet
        open={open}
        onOpenChange={setOpen}
        options={options}
        filters={filters}
        sortBy={sortBy}
        sortDirection={sortDirection}
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
  onFiltersChange,
  onSortChange,
  onReset,
}: {
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
      description="Narrow down the asset list."
    >
      <div
        className="flex max-h-[70svh] flex-col gap-4 overflow-auto"
        data-testid="asset-filters-sheet"
      >
        <Section title="Sort by">
          <SortRow
            active={sortBy === "createdAt" && sortDirection === "desc"}
            label="Recent"
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
                dotColor={category.color}
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
          <Section title="Tags">
            {options.tags.map((tag) => {
              const active = filters.tagIds.includes(tag.id);
              return (
                <OptionPill
                  key={tag.id}
                  active={active}
                  label={tag.name}
                  dotColor={tag.color}
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
          className="flex-1 cursor-pointer"
          onClick={onReset}
          data-testid="asset-filters-mobile-reset"
        >
          <X className="h-4 w-4" />
          Reset
        </Button>
        <Button
          type="button"
          className="flex-1 cursor-pointer"
          onClick={() => onOpenChange(false)}
          data-testid="asset-filters-mobile-apply"
        >
          Apply
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
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent",
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
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent",
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
          className={cn(
            "flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0",
            selectedId === null
              ? "bg-primary/5 font-medium text-primary"
              : "hover:bg-accent",
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
              className={cn(
                "flex w-full flex-col border-b border-border px-3 py-2 text-left last:border-b-0",
                active ? "bg-primary/5 text-primary" : "hover:bg-accent",
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
