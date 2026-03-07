"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { DEFAULT_APP_DATE_FORMAT, type AppDateFormat } from "@/lib/date-format";

export function useAppDateFormat(): AppDateFormat {
  const settings = useQuery(api.appSettings.getAppSettings, {});
  return (
    (settings?.dateFormat as AppDateFormat | undefined) ??
    DEFAULT_APP_DATE_FORMAT
  );
}
