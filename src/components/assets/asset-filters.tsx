"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Filter, Search, X } from "lucide-react";
import type { Id } from "@/lib/convex-api";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetFilterOptions,
  type AssetStatus,
} from "@/components/assets/types";
import {
  LocationPicker,
  type LocationPickerOption,
} from "@/components/locations/location-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

function TagsPicker({
  id,
  labelledBy,
  tags,
  selectedIds,
  onChange,
}: {
  id?: string;
  labelledBy?: string;
  tags: AssetFilterOptions["tags"];
  selectedIds: Id<"tags">[];
  onChange: (tagIds: Id<"tags">[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedCount = selectedIds.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-labelledby={labelledBy}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/40"
        >
          <span
            className={cn(
              "truncate",
              selectedCount > 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selectedCount === 0
              ? "All tags"
              : selectedCount === 1
                ? (tags.find((t) => t._id === selectedIds[0])?.name ?? "1 tag")
                : `${selectedCount} tags`}
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => {
                const checked = selectedIds.includes(tag._id);
                return (
                  <CommandItem
                    key={tag._id}
                    value={tag.name}
                    onSelect={() =>
                      onChange(
                        checked
                          ? removeTagId(selectedIds, tag._id)
                          : addTagId(selectedIds, tag._id),
                      )
                    }
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
                    {checked ? (
                      <Check className="ml-auto size-4 text-muted-foreground" />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MoreFilters({
  filters,
  options,
  onFiltersChange,
}: {
  filters: AssetFiltersState;
  options: AssetFilterOptions;
  onFiltersChange: (nextFilters: AssetFiltersState) => void;
}) {
  const defaultOpen = filters.locationId !== null || filters.tagIds.length > 0;
  const [open, setOpen] = useState(defaultOpen);

  const locationOptions = useMemo(
    () => options.locations as LocationPickerOption[],
    [options.locations],
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/60 bg-muted/20"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" />
          More filters
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="grid gap-3 border-t border-border/60 px-3 py-3 lg:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="asset-filter-location"
              id="asset-filter-location-label"
              className="text-sm font-medium"
            >
              Location
            </label>
            <LocationPicker
              id="asset-filter-location"
              labelledBy="asset-filter-location-label"
              value={filters.locationId}
              options={locationOptions}
              nullLabel="All locations"
              onChange={(locationId) =>
                onFiltersChange({ ...filters, locationId })
              }
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="asset-filter-tags"
              id="asset-filter-tags-label"
              className="text-sm font-medium"
            >
              Tags
            </label>
            <TagsPicker
              id="asset-filter-tags"
              labelledBy="asset-filter-tags-label"
              tags={options.tags}
              selectedIds={filters.tagIds}
              onChange={(tagIds) => onFiltersChange({ ...filters, tagIds })}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
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
          <Select
            value={filters.categoryId ?? "__all__"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                categoryId:
                  value === "__all__" ? null : (value as Id<"categories">),
              })
            }
          >
            <SelectTrigger className="min-w-44" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {options.categories.map((category) => (
                <SelectItem key={category._id} value={category._id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status ?? "__all__"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                status: value === "__all__" ? null : (value as AssetStatus),
              })
            }
          >
            <SelectTrigger className="min-w-44" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {ASSET_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {ASSET_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <MoreFilters
        filters={filters}
        options={options}
        onFiltersChange={onFiltersChange}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {filters.categoryId ? (
            <Badge className="gap-1 border-border/60 bg-muted/30 pr-1 text-xs">
              Category:{" "}
              {options.categories.find((c) => c._id === filters.categoryId)
                ?.name ?? "Unknown"}
              <button
                type="button"
                className="ml-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
                onClick={() =>
                  onFiltersChange({ ...filters, categoryId: null })
                }
                aria-label="Remove category filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : null}
          {filters.status ? (
            <Badge className="gap-1 border-border/60 bg-muted/30 pr-1 text-xs">
              Status: {ASSET_STATUS_LABELS[filters.status]}
              <button
                type="button"
                className="ml-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
                onClick={() => onFiltersChange({ ...filters, status: null })}
                aria-label="Remove status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : null}
          {filters.locationId ? (
            <Badge className="gap-1 border-border/60 bg-muted/30 pr-1 text-xs">
              Location:{" "}
              {options.locations.find((l) => l._id === filters.locationId)
                ?.path ?? "Unknown"}
              <button
                type="button"
                className="ml-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
                onClick={() =>
                  onFiltersChange({ ...filters, locationId: null })
                }
                aria-label="Remove location filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : null}
          {filters.tagIds.map((tagId) => {
            const tag = options.tags.find((t) => t._id === tagId);
            return (
              <Badge
                key={tagId}
                className="gap-1 border-border/60 bg-muted/30 pr-1 text-xs"
              >
                Tag: {tag?.name ?? "Unknown"}
                <button
                  type="button"
                  className="ml-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      tagIds: removeTagId(filters.tagIds, tagId),
                    })
                  }
                  aria-label={`Remove tag ${tag?.name ?? ""} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {search.trim() ? (
            <Badge className="gap-1 border-border/60 bg-muted/30 pr-1 text-xs">
              Search: {search.trim()}
              <button
                type="button"
                className="ml-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : null}
          {!hasFilters ? (
            <span className="text-xs text-muted-foreground">
              No active filters
            </span>
          ) : null}
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
