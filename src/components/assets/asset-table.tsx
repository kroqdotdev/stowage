"use client";

import { ArrowDown, ArrowUp, Eye, MoreHorizontal, Pencil, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusText } from "@/components/ui/status-text";
import { TagChip } from "@/components/ui/tag-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationPath } from "@/components/locations/location-path";
import type { AssetListItem } from "@/components/assets/types";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

export type AssetSortBy =
  | "createdAt"
  | "updatedAt"
  | "name"
  | "assetTag"
  | "status";
export type AssetSortDirection = "asc" | "desc";

function SortHeader({
  label,
  field,
  sortBy,
  sortDirection,
  onSort,
  arrowFirst = false,
}: {
  label: string;
  field: AssetSortBy;
  sortBy: AssetSortBy;
  sortDirection: AssetSortDirection;
  onSort: (field: AssetSortBy) => void;
  arrowFirst?: boolean;
}) {
  const active = sortBy === field;
  const Arrow = sortDirection === "asc" ? ArrowUp : ArrowDown;
  const arrow = active ? (
    <Arrow className="size-3 text-muted-foreground" aria-hidden="true" />
  ) : null;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-label={`Sort by ${label}`}
      className="inline-flex cursor-pointer items-center gap-1 font-semibold hover:underline hover:underline-offset-[3px]"
    >
      {arrowFirst ? arrow : null}
      {label}
      {arrowFirst ? null : arrow}
    </button>
  );
}

/*
  The Assets table lives on a card (its named exception: selection, the bulk
  tray and pagination live on it). Two type tones per row; the Name is the
  only ink 500 run. On tablet, Category and Location drop and the location
  becomes a 13px second line under the name. Updated is the sort key,
  right-aligned with the arrow leading. The overflow column is a fixed 44px
  that shows on hover, focus or selection.
*/
export function AssetTable({
  rows,
  loading,
  sortBy,
  sortDirection,
  selectedIds,
  onSort,
  onSelectRow,
  onSelectAll,
  onRowOpen,
  onRowEdit,
}: {
  rows: AssetListItem[];
  loading: boolean;
  sortBy: AssetSortBy;
  sortDirection: AssetSortDirection;
  selectedIds: Set<string>;
  onSort: (field: AssetSortBy) => void;
  onSelectRow: (assetId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onRowOpen: (assetId: string) => void;
  onRowEdit?: (assetId: string) => void;
}) {
  const allSelected =
    rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = !allSelected && rows.some((row) => selectedIds.has(row.id));

  const th = "h-[42px] rule-ink px-3.5 text-left text-[13px] font-semibold whitespace-nowrap text-foreground";
  const ariaSort = (field: AssetSortBy) =>
    sortBy === field ? (sortDirection === "asc" ? "ascending" : "descending") : undefined;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-0 border-collapse text-sm">
        <thead>
          <tr>
            <th className={cn(th, "w-11 pr-0")}>
              <Checkbox
                aria-label="Select all assets"
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => onSelectAll(checked === true)}
                disabled={rows.length === 0}
              />
            </th>
            <th className={th} aria-sort={ariaSort("assetTag")}>
              <SortHeader label="Tag" field="assetTag" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th className={th} aria-sort={ariaSort("name")}>
              <SortHeader label="Name" field="name" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th className={cn(th, "hidden lg:table-cell")}>Category</th>
            <th className={cn(th, "hidden lg:table-cell")}>Location</th>
            <th className={cn(th, "pl-[30px]")} aria-sort={ariaSort("status")}>
              <SortHeader label="Status" field="status" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th className={cn(th, "pr-1.5 text-right")} aria-sort={ariaSort("updatedAt")}>
              <SortHeader label="Updated" field="updatedAt" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} arrowFirst />
            </th>
            <th className={cn(th, "w-11 p-0")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="h-12 border-b border-border">
                <td className="px-3.5 pr-0">
                  <span className="block size-[18px] rounded-xs border-[1.5px] border-line-2" />
                </td>
                <td className="px-3.5">
                  <span className="block h-[23px] w-[62px] rounded-xs border border-line-2" />
                </td>
                <td className="px-3.5">
                  <Skeleton className="h-2.5" style={{ width: `${[60, 48, 70, 52, 64, 44][index]}%` }} />
                </td>
                <td className="hidden px-3.5 lg:table-cell"><Skeleton className="h-2.5 w-16" /></td>
                <td className="hidden px-3.5 lg:table-cell"><Skeleton className="h-2.5 w-24" /></td>
                <td className="pl-[30px]"><Skeleton className="h-2.5 w-14" /></td>
                <td className="pr-1.5"><Skeleton className="ml-auto h-2.5 w-16" /></td>
                <td />
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3.5 py-10 text-center text-ink-2">
                No assets match your filters.
              </td>
            </tr>
          ) : (
            rows.map((asset) => {
              const selected = selectedIds.has(asset.id);
              const time = formatRelativeTime(asset.updatedAt);
              return (
                <tr
                  key={asset.id}
                  aria-selected={selected}
                  className={cn(
                    "group h-12 cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-secondary focus-visible:bg-secondary md:h-14 lg:h-12",
                    selected && "bg-secondary shadow-[inset_2px_0_0_var(--foreground)]",
                  )}
                  onClick={() => onRowOpen(asset.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowOpen(asset.id);
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="px-3.5 pr-0" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select ${asset.name}`}
                      checked={selected}
                      onCheckedChange={(checked) => onSelectRow(asset.id, checked === true)}
                    />
                  </td>
                  <td className="px-3.5">
                    <TagChip weight="table">{asset.assetTag}</TagChip>
                  </td>
                  <td className="px-3.5 py-2">
                    <span className="block font-medium text-foreground">{asset.name}</span>
                    <LocationPath
                      path={asset.locationPath}
                      leafWeight="regular"
                      className="mt-0.5 text-[13px] leading-snug lg:hidden"
                    />
                  </td>
                  <td className="hidden px-3.5 whitespace-nowrap text-foreground lg:table-cell">
                    {asset.categoryName ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="hidden px-3.5 lg:table-cell">
                    <div className="flex max-w-[280px] whitespace-nowrap">
                      <LocationPath path={asset.locationPath} leafWeight="regular" />
                    </div>
                  </td>
                  <td className="px-3.5 whitespace-nowrap">
                    <StatusText status={asset.status} inTable className="max-lg:text-[13px]" />
                  </td>
                  <td className="pr-1.5 pl-3.5 text-right whitespace-nowrap text-ink-2">
                    <span className="hidden lg:inline">{time.long}</span>
                    <span className="lg:hidden">{time.short}</span>
                  </td>
                  <td className="w-11 p-0 pr-1.5 text-right" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Actions for ${asset.name}`}
                          className={cn(
                            "grid size-9 cursor-pointer place-items-center rounded-md text-ink-2 opacity-0 hover:bg-card group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                            selected && "opacity-100",
                          )}
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRowOpen(asset.id)}>
                          <Eye className="size-4" />
                          Open asset
                        </DropdownMenuItem>
                        {onRowEdit ? (
                          <DropdownMenuItem onClick={() => onRowEdit(asset.id)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSelectRow(asset.id, !selected)}>
                          {selected ? <Square className="size-4" /> : <CheckSquare className="size-4" />}
                          {selected ? "Deselect" : "Select"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
