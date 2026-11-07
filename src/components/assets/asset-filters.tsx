"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { AssetFilterOptions, AssetStatus } from "@/components/assets/types";
import {
  LocationPicker,
  type LocationPickerOption,
} from "@/components/locations/location-picker";
import { Button } from "@/components/ui/button";
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
  categoryId: string | null;
  status: AssetStatus | null;
  locationId: string | null;
  tagIds: string[];
  serviceGroupId?: string | null;
};

export const EMPTY_FILTERS: AssetFiltersState = {
  categoryId: null,
  status: null,
  locationId: null,
  tagIds: [],
  serviceGroupId: null,
};

function removeTagId(tagIds: string[], tagId: string) {
  return tagIds.filter((candidate) => candidate !== tagId);
}

const triggerClass =
  "flex h-9 min-w-32 cursor-pointer items-center justify-between gap-2 rounded-md border-[1.5px] border-input bg-card px-3 text-sm font-medium text-foreground outline-none hover:bg-secondary data-[state=open]:border-foreground";

function KeywordsPicker({
  id,
  labelledBy,
  tags,
  selectedIds,
  onChange,
}: {
  id?: string;
  labelledBy?: string;
  tags: AssetFilterOptions["tags"];
  selectedIds: string[];
  onChange: (tagIds: string[]) => void;
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
          aria-label={labelledBy ? undefined : "Filter by keywords"}
          className={triggerClass}
        >
          <span className="truncate">
            {selectedCount === 0
              ? "Keywords"
              : selectedCount === 1
                ? (tags.find((t) => t.id === selectedIds[0])?.name ?? "1 keyword")
                : `${selectedCount} keywords`}
          </span>
          <ChevronDown className="size-3.5 text-ink-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Find a keyword…" />
          <CommandList>
            <CommandEmpty>No keywords found.</CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => {
                const checked = selectedIds.includes(tag.id);
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() =>
                      onChange(
                        checked
                          ? removeTagId(selectedIds, tag.id)
                          : [...selectedIds, tag.id],
                      )
                    }
                  >
                    <span className="text-muted-foreground">#</span>
                    <span className="truncate">{tag.name}</span>
                    {checked ? <Check className="ml-auto size-4" /> : null}
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

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md border-[1.5px] border-foreground bg-chip pr-0.5 pl-2.5 text-[13px] text-ink-2">
      {label}
      <b className="font-semibold text-foreground">{value}</b>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label.toLowerCase()} filter`}
        className="grid size-6 cursor-pointer place-items-center rounded-md hover:bg-card hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

/*
  The Assets toolbar: the search field fills the row, then Category, Location,
  Keywords and Service plan as quiet dropdowns of one width. On tablet the
  dropdowns collapse to one Filters button. Applied filters show as chips in
  the keyword family; only "Reset" has a button's silhouette.
*/
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
  const [moreOpen, setMoreOpen] = useState(false);
  const locationOptions = useMemo(
    () => options.locations as LocationPickerOption[],
    [options.locations],
  );
  // Status has its own tabs above the toolbar, so it never shows as a chip.
  const hasFilters =
    Boolean(search.trim()) ||
    filters.categoryId !== null ||
    filters.locationId !== null ||
    filters.tagIds.length > 0 ||
    Boolean(filters.serviceGroupId);

  const dropdowns = (
    <>
      <Select
        value={filters.categoryId ?? "__all__"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            categoryId: value === "__all__" ? null : value,
          })
        }
      >
        <SelectTrigger className="min-w-32" aria-label="Filter by category">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All categories</SelectItem>
          {options.categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="min-w-32">
        <span id="asset-filter-location-label" className="sr-only">
          Location
        </span>
        <LocationPicker
          id="asset-filter-location"
          labelledBy="asset-filter-location-label"
          value={filters.locationId}
          options={locationOptions}
          nullLabel="Location"
          onChange={(locationId) => onFiltersChange({ ...filters, locationId })}
          compact
        />
      </div>

      <span id="asset-filter-tags-label" className="sr-only">
        Keywords
      </span>
      <KeywordsPicker
        id="asset-filter-tags"
        labelledBy="asset-filter-tags-label"
        tags={options.tags}
        selectedIds={filters.tagIds}
        onChange={(tagIds) => onFiltersChange({ ...filters, tagIds })}
      />

      {options.serviceGroups.length > 0 ? (
        <Select
          value={filters.serviceGroupId ?? "__all__"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              serviceGroupId: value === "__all__" ? null : value,
            })
          }
        >
          <SelectTrigger className="min-w-32" aria-label="Filter by service plan">
            <SelectValue placeholder="Service plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All service plans</SelectItem>
            {options.serviceGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </>
  );

  return (
    <div className="mb-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, tag or serial"
            className="pl-9"
            aria-label="Search assets"
          />
        </div>
        <button
          type="button"
          aria-label="More filters"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "grid size-9 cursor-pointer place-items-center rounded-md border-[1.5px] border-foreground bg-card text-foreground hover:bg-secondary lg:hidden",
            moreOpen && "bg-secondary",
          )}
        >
          <SlidersHorizontal className="size-4" />
        </button>
        {/* One set of dropdowns: inline on desktop, a wrapped second row on
            tablet when "More filters" is open. */}
        <div
          className={cn(
            "basis-full flex-wrap items-center gap-2 lg:flex lg:basis-auto lg:flex-nowrap",
            moreOpen ? "flex" : "hidden",
          )}
        >
          {dropdowns}
        </div>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.categoryId ? (
            <FilterChip
              label="Category"
              value={options.categories.find((c) => c.id === filters.categoryId)?.name ?? "Unknown"}
              onRemove={() => onFiltersChange({ ...filters, categoryId: null })}
            />
          ) : null}
          {filters.locationId ? (
            <FilterChip
              label="Location"
              value={options.locations.find((l) => l.id === filters.locationId)?.name ?? "Unknown"}
              onRemove={() => onFiltersChange({ ...filters, locationId: null })}
            />
          ) : null}
          {filters.tagIds.map((tagId) => (
            <FilterChip
              key={tagId}
              label="Keyword"
              value={options.tags.find((t) => t.id === tagId)?.name ?? "Unknown"}
              onRemove={() =>
                onFiltersChange({ ...filters, tagIds: removeTagId(filters.tagIds, tagId) })
              }
            />
          ))}
          {filters.serviceGroupId ? (
            <FilterChip
              label="Service plan"
              value={options.serviceGroups.find((g) => g.id === filters.serviceGroupId)?.name ?? "Unknown"}
              onRemove={() => onFiltersChange({ ...filters, serviceGroupId: null })}
            />
          ) : null}
          {search.trim() ? (
            <FilterChip label="Search" value={search.trim()} onRemove={() => onSearchChange("")} />
          ) : null}
          <Button type="button" variant="link" size="xs" onClick={onReset}>
            Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}
