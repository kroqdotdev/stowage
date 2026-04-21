"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { usePocketBase } from "@/app/PocketBaseClientProvider";

type UseRealtimeRecordOptions<T> = {
  collection: string;
  recordId: string | null | undefined;
  fetcher: () => Promise<T>;
  queryKey?: readonly unknown[];
  enabled?: boolean;
};

/**
 * Subscribes to realtime events for a single PB record (by id) and invalidates
 * the matching TanStack Query cache entry on every change. Disabled when
 * `recordId` is nullish.
 */
export function useRealtimeRecord<T>({
  collection,
  recordId,
  fetcher,
  queryKey,
  enabled = true,
}: UseRealtimeRecordOptions<T>) {
  const pb = usePocketBase();
  const qc = useQueryClient();
  const key = useMemo(
    () => queryKey ?? [collection, recordId],
    [queryKey, collection, recordId],
  );

  const isEnabled = enabled && !!recordId;
  const query = useQuery({
    queryKey: key,
    queryFn: fetcher,
    enabled: isEnabled,
  });

  useEffect(() => {
    if (!isEnabled || !recordId) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    pb.collection(collection)
      .subscribe(recordId, () => {
        qc.invalidateQueries({ queryKey: key });
      })
      .then((fn) => {
        if (cancelled) fn();
        else unsub = fn;
      })
      .catch((error) => {
        console.error(
          `[useRealtimeRecord] subscribe(${collection}/${recordId}) failed`,
          error,
        );
      });

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [pb, qc, collection, recordId, key, isEnabled]);

  return query;
}
