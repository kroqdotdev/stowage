"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { usePocketBase } from "@/app/PocketBaseClientProvider";

type UseRealtimeCollectionOptions<T> = {
  collection: string;
  fetcher: () => Promise<T>;
  queryKey?: readonly unknown[];
  enabled?: boolean;
};

/**
 * Subscribes to PB realtime events on a collection and invalidates the matching
 * TanStack Query cache entry whenever a record changes. `fetcher` returns the
 * shape the component wants (usually hits a Next API route).
 */
export function useRealtimeCollection<T>({
  collection,
  fetcher,
  queryKey,
  enabled = true,
}: UseRealtimeCollectionOptions<T>) {
  const pb = usePocketBase();
  const qc = useQueryClient();
  const key = useMemo(() => queryKey ?? [collection], [queryKey, collection]);

  const query = useQuery({ queryKey: key, queryFn: fetcher, enabled });

  useEffect(() => {
    if (!enabled) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    pb.collection(collection)
      .subscribe("*", () => {
        qc.invalidateQueries({ queryKey: key });
      })
      .then((fn) => {
        if (cancelled) fn();
        else unsub = fn;
      })
      .catch((error) => {
        console.error(
          `[useRealtimeCollection] subscribe(${collection}) failed`,
          error,
        );
      });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [pb, qc, collection, enabled, key]);

  return query;
}
