"use client";

import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./location-tree.module.css";

export type LocationTreeItem = {
  _id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  path: string;
  createdAt: number;
  updatedAt: number;
};

export function buildLocationChildrenMap(locations: LocationTreeItem[]) {
  const map = new Map<string | null, LocationTreeItem[]>();
  for (const location of locations) {
    const key = location.parentId ?? null;
    const existing = map.get(key);
    if (existing) {
      existing.push(location);
    } else {
      map.set(key, [location]);
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }

  return map;
}

export function collectDescendantIds(
  locationId: string,
  childrenByParent: Map<string | null, LocationTreeItem[]>,
) {
  const descendants = new Set<string>();
  const stack = [locationId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const children = childrenByParent.get(current) ?? [];
    for (const child of children) {
      if (!descendants.has(child._id)) {
        descendants.add(child._id);
        stack.push(child._id);
      }
    }
  }

  return descendants;
}

export function LocationTree({
  locations,
  selectedId,
  expandedIds,
  canManage,
  onToggleExpand,
  onSelect,
  onAddChild,
  onDelete,
}: {
  locations: LocationTreeItem[];
  selectedId: string | null;
  expandedIds: Set<string>;
  canManage: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const childrenByParent = buildLocationChildrenMap(locations);
  const roots = childrenByParent.get(null) ?? [];

  if (locations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No locations yet. Add a root location to begin your hierarchy.
      </div>
    );
  }

  function renderNode(node: LocationTreeItem): React.ReactNode {
    const children = childrenByParent.get(node._id) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(node._id);
    const isSelected = selectedId === node._id;

    return (
      <li key={node._id} className={styles.node}>
        <div className="relative z-10">
          <div
            className={cn(
              "group rounded-lg px-2 py-2 transition",
              isSelected ? "bg-muted/50 dark:bg-muted/55" : "hover:bg-muted/35",
            )}
          >
            <div className="flex items-start gap-2">
              {hasChildren ? (
                <button
                  type="button"
                  className="mt-0.5 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80"
                  onClick={() => onToggleExpand(node._id)}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/35"
                >
                  <span className="h-4 w-4" />
                </span>
              )}

              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer text-left"
                onClick={() => onSelect(node._id)}
              >
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">
                    {node.name}
                  </span>
                  {hasChildren ? (
                    <span className="rounded-full border border-border/70 px-1.5 py-0 text-[11px] text-muted-foreground">
                      {children.length}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {node.path}
                </div>
              </button>

              {canManage ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={`Actions for ${node.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelect(node._id)}>
                      <Pencil className="h-4 w-4" />
                      Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddChild(node._id)}>
                      <Plus className="h-4 w-4" />
                      Add child
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(node._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded ? (
          <ul className={styles.children}>
            {children.map((child) => renderNode(child))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <ul className={styles.tree}>{roots.map((root) => renderNode(root))}</ul>
  );
}
