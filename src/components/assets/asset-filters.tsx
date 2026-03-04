"use client";

import { Filter, Search, X } from "lucide-react";
import type { Id } from "@/lib/convex-api";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetFilterOptions,
  type AssetStatus,
} from "@/components/assets/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AssetFiltersState = {
  categoryId: Id<"categories"> | null;
  status: AssetStatus | null;
  locationId: Id<"locations"> | null;
  tagIds: Id<"tags">[];
};

function removeTagId(tagIds: Id<"tags">[], tagId: Id<"tags">) {
  return tagIds.filter((candidate) => candidate !== tagId);
}

function addTagId(tagIds: Id<"tags">[], tagId: Id<"tags">) {
  if (tagIds.includes(tagId)) {
    return tagIds;
  }

  return [...tagIds, tagId];
}

export function AssetFilters({
  options,
  search,
  filters,
  onSearchChange,
  onFiltersChange,
  onReset,
}: {
  options: AssetFilterOptions;
  search: string;
  filters: AssetFiltersState;
  onSearchChange: (search: string) => void;
  onFiltersChange: (nextFilters: AssetFiltersState) => void;
  onReset: () => void;
}) {
  const hasFilters =
    Boolean(search.trim()) ||
    filters.categoryId !== null ||
    filters.status !== null ||
    filters.locationId !== null ||
    filters.tagIds.length > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search assets by name, tag, or notes"
            className="pl-9"
            aria-label="Search assets"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
          <label className="sr-only" htmlFor="asset-filter-category">
            Filter by category
          </label>
          <select
            id="asset-filter-category"
            className="h-9 min-w-44 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.categoryId ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                categoryId: event.target.value
                  ? (event.target.value as Id<"categories">)
                  : null,
              })
            }
          >
            <option value="">All categories</option>
            {options.categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="asset-filter-status">
            Filter by status
          </label>
          <select
            id="asset-filter-status"
            className="h-9 min-w-44 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.status ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: event.target.value
                  ? (event.target.value as AssetStatus)
                  : null,
              })
            }
          >
            <option value="">All statuses</option>
            {ASSET_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details
        className="rounded-lg border border-border/60 bg-muted/20"
        open={filters.locationId !== null || filters.tagIds.length > 0}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            More filters
          </span>
          <span className="text-xs text-muted-foreground">
            Location and tags
          </span>
        </summary>

        <div className="grid gap-3 border-t border-border/60 px-3 py-3 lg:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="asset-filter-location"
              className="text-sm font-medium"
            >
              Location
            </label>
            <select
              id="asset-filter-location"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={filters.locationId ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  locationId: event.target.value
                    ? (event.target.value as Id<"locations">)
                    : null,
                })
              }
            >
              <option value="">All locations</option>
              {options.locations.map((location) => (
                <option key={location._id} value={location._id}>
                  {location.path}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Tags</legend>
            <div className="max-h-32 space-y-1 overflow-auto rounded-md border border-border/60 bg-background p-2">
              {options.tags.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No tags available.
                </p>
              ) : (
                options.tags.map((tag) => {
                  const checked = filters.tagIds.includes(tag._id);
                  return (
                    <label
                      key={tag._id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          onFiltersChange({
                            ...filters,
                            tagIds: event.target.checked
                              ? addTagId(filters.tagIds, tag._id)
                              : removeTagId(filters.tagIds, tag._id),
                          })
                        }
                      />
                      <span>{tag.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </fieldset>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {filters.categoryId ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              Category
            </span>
          ) : null}
          {filters.status ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              Status
            </span>
          ) : null}
          {filters.locationId ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              Location
            </span>
          ) : null}
          {filters.tagIds.length > 0 ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              Tags ({filters.tagIds.length})
            </span>
          ) : null}
          {search.trim() ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              Search
            </span>
          ) : null}
          {!hasFilters ? <span>No active filters</span> : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={onReset}
          disabled={!hasFilters}
        >
          <X className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
