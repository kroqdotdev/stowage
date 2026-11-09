"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/*
  False during server render and hydration, true afterwards. Use it to keep
  client-only data (query cache filled by the shell before a suspended page
  hydrates, localStorage) out of the first client render.
*/
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
