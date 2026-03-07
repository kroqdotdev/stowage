"use client";

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { StatusBadge } from "@/components/assets/status-badge";
import type { AssetStatus } from "@/components/assets/types";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { api } from "@/lib/convex-api";

type SearchResult = {
  _id: string;
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

export function GlobalSearch() {
  const router = useRouter();
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

  const hasSearchTerm =
    debouncedSearchTerm.length >= MIN_SEARCH_TERM_LENGTH;
  const resultsQuery = useQuery(
    api.search.searchAssets,
    hasSearchTerm ? { term: debouncedSearchTerm, limit: 10 } : "skip",
  );

  const results = useMemo(
    () => (resultsQuery ?? []) as SearchResult[],
    [resultsQuery],
  );

  const handleOpenShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) {
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

  const isLoading = hasSearchTerm && resultsQuery === undefined;

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open global search"
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-9 w-full max-w-xl cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/70 px-3 text-left shadow-sm transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-global-search-trigger
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-sm text-muted-foreground">
            Search assets...
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 rounded-md border border-border/70 bg-background/80 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground md:inline-flex">
          Ctrl/Cmd K
        </span>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search assets"
        description="Search assets by name, asset tag, or notes."
        className="w-[calc(100vw-1.5rem)] max-w-2xl p-0"
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
                  key={result._id}
                  value={`${result.assetTag} ${result.name}`}
                  onSelect={() => handleSelect(result._id)}
                  className="cursor-pointer rounded-lg px-3 py-3"
                  data-search-result={result._id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{result.name}</span>
                      <StatusBadge status={result.status} className="shrink-0" />
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-mono">{result.assetTag}</span>
                      <span className="text-border">/</span>
                      <span className="truncate">{getSecondaryMeta(result)}</span>
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
