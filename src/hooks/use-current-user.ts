"use client";

import { useQuery } from "@tanstack/react-query";

import { getCurrentUser, type SessionUser } from "@/lib/api/auth";

export const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery<SessionUser | null>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });
}
