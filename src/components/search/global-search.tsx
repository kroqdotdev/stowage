"use client";

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { StatusBadge } from "@/components/assets/status-badge";
import { TagChip } from "@/components/ui/tag-chip";
import type { AssetStatus } from "@/components/assets/types";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { searchAssets } from "@/lib/api/search";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  categoryName: string | null;
  locationPath: string | null;
};

const SEARCH_DEBOUNCE_MS = 150;
const MIN_SEARCH_TERM_LENGTH = 2;

function getSecondaryMeta(result: SearchResult) {
  const parts = [result.categoryName, result.locationPath].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "No category or location";
}

export type GlobalSearchVariant = "sidebar" | "rail" | "icon";

const noopSubscribe = () => () => {};

function useIsMacPlatform() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

export function GlobalSearch({
  variant = "sidebar",
  className,
}: {
  variant?: GlobalSearchVariant;
  className?: string;
}) {
  const router = useRouter();
  const isMac = useIsMacPlatform();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue.trim());
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(deferredSearchValue);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [deferredSearchValue]);

  const hasSearchTerm = debouncedSearchTerm.length >= MIN_SEARCH_TERM_LENGTH;
  const resultsQuery = useQuery({
    queryKey: ["search", "assets", debouncedSearchTerm],
    queryFn: () => searchAssets(debouncedSearchTerm),
    enabled: hasSearchTerm,
  });

  const results = useMemo(
    () => (resultsQuery.data ?? []) as SearchResult[],
    [resultsQuery.data],
  );

  const handleOpenShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      !((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")
    ) {
      return;
    }

    event.preventDefault();
    setOpen(true);
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleOpenShortcut(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isLoading = hasSearchTerm && resultsQuery.isPending;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchValue("");
      setDebouncedSearchTerm("");
    }
  }

  function handleSelect(assetId: string) {
    handleOpenChange(false);
    router.push(`/assets/${assetId}`);
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open global search"
          aria-keyshortcuts="Control+K Meta+K"
          className={cn(
            "grid size-11 cursor-pointer place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent",
            className,
          )}
          data-global-search-trigger
        >
          <Search className="size-5" />
        </button>
      ) : variant === "rail" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open global search"
          aria-keyshortcuts="Control+K Meta+K"
          className={cn(
            "flex h-12 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-sidebar-muted text-[13px] text-sidebar-foreground hover:bg-sidebar-accent",
            className,
          )}
          data-global-search-trigger
        >
          <Search className="size-[18px] text-white" />
          Search
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open global search"
          aria-keyshortcuts="Control+K Meta+K"
          className={cn(
            "flex h-9 w-full cursor-pointer items-center gap-2 rounded-md bg-sidebar-accent px-2.5 text-left text-sm text-sidebar-muted hover:text-sidebar-foreground",
            className,
          )}
          data-global-search-trigger
        >
          <Search className="size-4 shrink-0" />
          <span className="min-w-0 truncate">Search assets, locations</span>
          <kbd className="ml-auto shrink-0 font-mono text-[13px] font-medium">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search assets"
        description="Search assets by name, asset tag, or notes."
        className="w-[calc(100vw-1.5rem)] max-w-2xl gap-0 p-0"
      >
        <CommandInput
          value={searchValue}
          onValueChange={setSearchValue}
          placeholder="Search assets by name, tag, or notes..."
        />
        <CommandList>
          {!hasSearchTerm ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Type at least two characters to search assets by name, tag, or
              notes.
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching assets...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No assets found.
            </div>
          ) : (
            <CommandGroup heading="Assets">
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.assetTag} ${result.name}`}
                  onSelect={() => handleSelect(result.id)}
                  className="cursor-pointer rounded-lg px-3 py-3"
                  data-search-result={result.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">
                        {result.name}
                      </span>
                      <StatusBadge
                        status={result.status}
                        className="shrink-0 text-[13px]"
                      />
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <TagChip weight="table">{result.assetTag}</TagChip>
                      <span className="text-border">/</span>
                      <span className="truncate">
                        {getSecondaryMeta(result)}
                      </span>
                    </div>
                  </div>
                  <CommandShortcut className="flex items-center gap-1 normal-case tracking-normal">
                    <CornerDownLeft className="h-3.5 w-3.5" />
                    Open
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
