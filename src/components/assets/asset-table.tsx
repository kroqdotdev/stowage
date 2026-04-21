"use client";

import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Eye,
  Pencil,
  Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { StatusBadge } from "@/components/assets/status-badge";
import type { AssetListItem } from "@/components/assets/types";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";

export type AssetSortBy = "createdAt" | "name" | "assetTag" | "status";
export type AssetSortDirection = "asc" | "desc";

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: AssetSortDirection;
}) {
  if (!active) {
    return <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />;
  }

  if (direction === "asc") {
    return <ArrowUp className="h-3.5 w-3.5" />;
  }

  return <ArrowDown className="h-3.5 w-3.5" />;
}

function SortButton({
  label,
  field,
  activeField,
  activeDirection,
  onSort,
}: {
  label: string;
  field: AssetSortBy;
  activeField: AssetSortBy;
  activeDirection: AssetSortDirection;
  onSort: (field: AssetSortBy) => void;
}) {
  const active = activeField === field;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="cursor-pointer px-1.5"
      onClick={() => onSort(field)}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <SortIcon active={active} direction={activeDirection} />
    </Button>
  );
}

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
  const dateFormat = useAppDateFormat();
  const allSelected =
    rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-background shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/35 text-left">
          <tr>
            <th className="w-10 px-3 py-2">
              <Checkbox
                aria-label="Select all assets"
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(checked === true)}
                disabled={rows.length === 0}
              />
            </th>
            <th className="px-3 py-2">
              <SortButton
                label="Asset tag"
                field="assetTag"
                activeField={sortBy}
                activeDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2">
              <SortButton
                label="Name"
                field="name"
                activeField={sortBy}
                activeDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">
              <SortButton
                label="Status"
                field="status"
                activeField={sortBy}
                activeDirection={sortDirection}
                onSort={onSort}
              />
            </th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2 text-right">
              <SortButton
                label="Created"
                field="createdAt"
                activeField={sortBy}
                activeDirection={sortDirection}
                onSort={onSort}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-10 text-center text-muted-foreground"
              >
                Loading assets...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-10 text-center text-muted-foreground"
              >
                No assets match your filters.
              </td>
            </tr>
          ) : (
            rows.map((asset) => {
              const selected = selectedIds.has(asset.id);

              return (
                <ContextMenu key={asset.id}>
                  <ContextMenuTrigger asChild>
                    <tr
                      className="cursor-pointer border-t border-border/50 transition hover:bg-orange-50/50 focus-visible:bg-orange-50/50 dark:hover:bg-stone-800/50 dark:focus-visible:bg-stone-800/50"
                      onClick={() => onRowOpen(asset.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowOpen(asset.id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td
                        className="px-3 py-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          aria-label={`Select ${asset.name}`}
                          checked={selected}
                          onCheckedChange={(checked) =>
                            onSelectRow(asset.id, checked === true)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs font-semibold tracking-wide text-muted-foreground">
                        {asset.assetTag}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm font-semibold">
                          {asset.name}
                        </div>
                        {asset.tagNames.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {asset.tagNames.slice(0, 2).map((tagName) => (
                              <Badge
                                key={tagName}
                                className="border border-border/70 bg-muted/20 text-[10px]"
                              >
                                {tagName}
                              </Badge>
                            ))}
                            {asset.tagNames.length > 2 ? (
                              <Badge className="border border-border/70 bg-muted/20 text-[10px]">
                                +{asset.tagNames.length - 2}
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {asset.categoryName ? (
                          <Badge className="border border-border/60 bg-muted/20 text-xs">
                            {asset.categoryColor ? (
                              <span
                                className="inline-block h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: asset.categoryColor }}
                              />
                            ) : null}
                            {asset.categoryName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {asset.locationPath ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatDateFromTimestamp(asset.createdAt, dateFormat)}
                      </td>
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onRowOpen(asset.id)}>
                      <Eye className="h-4 w-4" />
                      View details
                    </ContextMenuItem>
                    {onRowEdit ? (
                      <ContextMenuItem onClick={() => onRowEdit(asset.id)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </ContextMenuItem>
                    ) : null}
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => onSelectRow(asset.id, !selected)}
                    >
                      {selected ? (
                        <Square className="h-4 w-4" />
                      ) : (
                        <CheckSquare className="h-4 w-4" />
                      )}
                      {selected ? "Deselect" : "Select"}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
