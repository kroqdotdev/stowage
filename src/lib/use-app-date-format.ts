"use client";

import { useQuery } from "@tanstack/react-query";

import { getAppSettings } from "@/lib/api/app-settings";
import { DEFAULT_APP_DATE_FORMAT, type AppDateFormat } from "@/lib/date-format";

export function useAppDateFormat(): AppDateFormat {
  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60_000,
  });
  return (data?.dateFormat as AppDateFormat | undefined) ?? DEFAULT_APP_DATE_FORMAT;
}
