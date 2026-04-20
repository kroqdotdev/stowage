"use client";

import { useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type LocationPickerOption = {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
};

type LocationTreeNode = LocationPickerOption & {
  children: LocationTreeNode[];
};

function sortByName(left: LocationPickerOption, right: LocationPickerOption) {
  return left.name.localeCompare(right.name, undefined, {
    sensitivity: "base",
  });
}

function buildLocationTree(options: LocationPickerOption[]) {
  const optionsById = new Map(
    options.map((location) => [location.id, location]),
  );
  const childrenByParent = new Map<string | null, LocationPickerOption[]>();

  for (const location of options) {
    const parentId =
      location.parentId &&
      location.parentId !== location.id &&
      optionsById.has(location.parentId)
        ? location.parentId
        : null;
    const siblings = childrenByParent.get(parentId);
    if (siblings) {
      siblings.push(location);
    } else {
      childrenByParent.set(parentId, [location]);
    }
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort(sortByName);
  }

  const visited = new Set<string>();

  function buildBranch(
    location: LocationPickerOption,
    ancestors: Set<string>,
  ): LocationTreeNode {
    const lineage = new Set(ancestors);
    lineage.add(location.id);
    visited.add(location.id);

    const children = (childrenByParent.get(location.id) ?? [])
      .filter((child) => !lineage.has(child.id))
      .map((child) => buildBranch(child, lineage));

    return {
      ...location,
      children,
    };
  }

  const roots = (childrenByParent.get(null) ?? []).map((root) =>
    buildBranch(root, new Set()),
  );

  if (visited.size < options.length) {
    const remaining = options
      .filter((option) => !visited.has(option.id))
      .sort(sortByName);

    for (const option of remaining) {
      roots.push(buildBranch(option, new Set()));
    }
  }

  return {
    roots,
    optionsById,
  };
}

export function LocationPicker({
  value,
  options,
  disabled = false,
  onChange,
  id,
  labelledBy,
  nullLabel = "No location",
}: {
  value: string | null;
  options: LocationPickerOption[];
  disabled?: boolean;
  onChange: (locationId: string | null) => void;
  id?: string;
  labelledBy?: string;
  nullLabel?: string;
}) {
  const { roots, optionsById } = useMemo(
    () => buildLocationTree(options),
    [options],
  );

  if (options.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 bg-muted/15 px-3 py-2 text-sm text-muted-foreground">
        No locations available.
      </div>
    );
  }

  const selectedPath = value ? (optionsById.get(value)?.path ?? null) : null;

  function renderNode(node: LocationTreeNode) {
    const isSelected = value === node.id;
    if (node.children.length === 0) {
      return (
        <DropdownMenuItem key={node.id} onSelect={() => onChange(node.id)}>
          <span className="truncate">{node.name}</span>
          {isSelected ? (
            <Check className="ml-auto size-4 text-muted-foreground" />
          ) : null}
        </DropdownMenuItem>
      );
    }

    return (
      <DropdownMenuSub key={node.id}>
        <DropdownMenuSubTrigger className="pr-2">
          <span className="truncate">{node.name}</span>
          {isSelected ? (
            <Check className="ml-auto size-4 text-muted-foreground" />
          ) : null}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-56">
          <DropdownMenuItem onSelect={() => onChange(node.id)}>
            <span className="truncate">Select {node.name}</span>
            {isSelected ? (
              <Check className="ml-auto size-4 text-muted-foreground" />
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {node.children.map((child) => renderNode(child))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            id={id}
            aria-labelledby={labelledBy}
            disabled={disabled}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/40"
          >
            <span
              className={cn(
                "truncate",
                selectedPath ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {selectedPath ?? nullLabel}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"
        >
          <DropdownMenuItem onSelect={() => onChange(null)}>
            <span>{nullLabel}</span>
            {value === null ? (
              <Check className="ml-auto size-4 text-muted-foreground" />
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {roots.map((node) => renderNode(node))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedPath ? (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedPath}
        </p>
      ) : null}
    </div>
  );
}
