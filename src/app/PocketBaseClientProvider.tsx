"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import PocketBase from "pocketbase";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PbContext = {
  pb: PocketBase;
};

const Context = createContext<PbContext | null>(null);

export function PocketBaseClientProvider({
  children,
  pocketbaseUrl,
}: {
  children: ReactNode;
  pocketbaseUrl: string;
}) {
  const [pb] = useState(() => new PocketBase(pocketbaseUrl));
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  const value = useMemo(() => ({ pb }), [pb]);

  return (
    <QueryClientProvider client={queryClient}>
      <Context.Provider value={value}>{children}</Context.Provider>
    </QueryClientProvider>
  );
}

export function usePocketBase() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("usePocketBase must be used inside PocketBaseClientProvider");
  }
  return ctx.pb;
}
