"use client";

import { useMemo, type ReactElement } from "react";
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
  compact = false,
  trigger,
}: {
  compact?: boolean;
  /* A custom trigger button, for example the asset hero's picker run. */
  trigger?: ReactElement;
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

  // With a custom trigger (the asset hero) keep showing the current value
  // while the list loads; the menu just has fewer entries until then.
  if (options.length === 0 && !trigger) {
    return (
      <div className="flex h-9 items-center rounded-md border-[1.5px] border-dashed border-input px-3 text-sm text-muted-foreground">
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
    <div className={cn(compact ? "" : "space-y-2")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? <button
            type="button"
            id={id}
            aria-labelledby={labelledBy}
            disabled={disabled}
            className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border-[1.5px] border-input bg-card px-3 text-sm font-medium outline-none transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-foreground"
          >
            <span
              className={cn(
                "truncate",
                selectedPath || compact ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {compact
                ? (value ? (optionsById.get(value)?.name ?? nullLabel) : nullLabel)
                : (selectedPath ?? nullLabel)}
            </span>
            <ChevronDown className="size-3.5 text-ink-2" />
          </button>}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn(
            "min-w-56",
            !trigger && "w-[var(--radix-dropdown-menu-trigger-width)]",
          )}
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
      {selectedPath && !compact ? (
        <p className="text-[13px] text-ink-2">
          Selected: {selectedPath}
        </p>
      ) : null}
    </div>
  );
}
