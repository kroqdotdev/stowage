"use client";

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  // useSyncExternalStore is the SSR-safe primitive for this: on the server it
  // uses `getServerSnapshot` (always `false`), and on the first client render
  // it returns the real matchMedia value. React handles the transition
  // without flagging a hydration mismatch, so consumers get the correct
  // viewport value without the "flash desktop, then swap to mobile"
  // behaviour that a `useState(false) + useEffect` pattern produces.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
