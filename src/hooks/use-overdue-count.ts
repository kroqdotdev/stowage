"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview } from "@/lib/api/dashboard";

/*
  The overdue-services count shown as a badge on Services in every nav. It
  shares the dashboard overview query so the dashboard and the shell make one
  request between them.
*/
export function useOverdueCount() {
  const { data } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
    staleTime: 60_000,
  });
  if (!data?.serviceSchedulingEnabled) return 0;
  return data.overdueServiceCount;
}
