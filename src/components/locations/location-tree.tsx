"use client"

import { ChevronDown, ChevronRight, FolderTree, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TREE_INDENT_PX = 20
const TREE_BASE_LEFT_PX = 10
const TREE_CONNECTOR_OFFSET_PX = 10
const TREE_CONNECTOR_ELBOW_WIDTH_PX = 14
const TREE_CONNECTOR_ELBOW_HEIGHT_PX = 12
const TREE_CONNECTOR_ANCHOR_Y_PX = 22

export type LocationTreeItem = {
  _id: string
  name: string
  parentId: string | null
  description: string | null
  path: string
  createdAt: number
  updatedAt: number
}

export function buildLocationChildrenMap(locations: LocationTreeItem[]) {
  const map = new Map<string | null, LocationTreeItem[]>()
  for (const location of locations) {
    const key = location.parentId ?? null
    const existing = map.get(key)
    if (existing) {
      existing.push(location)
    } else {
      map.set(key, [location])
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }

  return map
}

export function collectDescendantIds(
  locationId: string,
  childrenByParent: Map<string | null, LocationTreeItem[]>,
) {
  const descendants = new Set<string>()
  const stack = [locationId]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) {
      continue
    }

    const children = childrenByParent.get(current) ?? []
    for (const child of children) {
      if (!descendants.has(child._id)) {
        descendants.add(child._id)
        stack.push(child._id)
      }
    }
  }

  return descendants
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
  locations: LocationTreeItem[]
  selectedId: string | null
  expandedIds: Set<string>
  canManage: boolean
  onToggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
  onDelete: (id: string) => void
}) {
  const childrenByParent = buildLocationChildrenMap(locations)
  const roots = childrenByParent.get(null) ?? []

  if (locations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No locations yet. Add a root location to begin your hierarchy.
      </div>
    )
  }

  function renderNode(
    node: LocationTreeItem,
    depth: number,
    isLastSibling = false,
  ): React.ReactNode {
    const children = childrenByParent.get(node._id) ?? []
    const hasChildren = children.length > 0
    const isExpanded = expandedIds.has(node._id)
    const isSelected = selectedId === node._id
    const rowPaddingLeft = depth * TREE_INDENT_PX + TREE_BASE_LEFT_PX
    const connectorLeft = rowPaddingLeft - TREE_CONNECTOR_OFFSET_PX

    return (
      <li key={node._id} className="relative space-y-1">
        {depth > 0 ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-0 w-px bg-muted-foreground/55"
              style={{
                left: `${connectorLeft}px`,
                top: 0,
                height: `${TREE_CONNECTOR_ANCHOR_Y_PX - TREE_CONNECTOR_ELBOW_HEIGHT_PX}px`,
              }}
            />

            <span
              aria-hidden="true"
              className="pointer-events-none absolute z-0 rounded-bl-md border-l border-b border-muted-foreground/60"
              style={{
                left: `${connectorLeft}px`,
                top: `${TREE_CONNECTOR_ANCHOR_Y_PX - TREE_CONNECTOR_ELBOW_HEIGHT_PX}px`,
                width: `${TREE_CONNECTOR_ELBOW_WIDTH_PX}px`,
                height: `${TREE_CONNECTOR_ELBOW_HEIGHT_PX}px`,
              }}
            />

            {!isLastSibling ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute z-0 w-px bg-muted-foreground/55"
                style={{
                  left: `${connectorLeft}px`,
                  top: `${TREE_CONNECTOR_ANCHOR_Y_PX}px`,
                  bottom: 0,
                }}
              />
            ) : null}
          </>
        ) : null}

        <div
          className={cn(
            "group relative z-10 rounded-lg border border-transparent bg-background/70 px-2 py-2 transition",
            isSelected ? "border-border bg-accent/35" : "hover:bg-muted/35",
          )}
          style={{ paddingLeft: `${rowPaddingLeft}px` }}
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              className={cn(
                "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-muted-foreground",
                hasChildren
                  ? "cursor-pointer hover:border-border/60 hover:bg-background"
                  : "pointer-events-none opacity-30",
              )}
              onClick={() => hasChildren && onToggleExpand(node._id)}
              aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : "No children"}
              aria-hidden={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer text-left"
              onClick={() => onSelect(node._id)}
            >
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{node.name}</span>
                {hasChildren ? (
                  <span className="rounded-full border border-border/70 px-1.5 py-0 text-[11px] text-muted-foreground">
                    {children.length}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{node.path}</div>
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
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(node._id)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {hasChildren && isExpanded ? (
          <ul className="space-y-1">
            {children.map((child, index) =>
              renderNode(child, depth + 1, index === children.length - 1),
            )}
          </ul>
        ) : null}
      </li>
    )
  }

  return (
    <ul className="space-y-1">
      {roots.map((root, index) => renderNode(root, 0, index === roots.length - 1))}
    </ul>
  )
}
