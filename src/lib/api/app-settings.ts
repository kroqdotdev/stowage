import { apiFetch } from "@/lib/api-client";

export const APP_DATE_FORMATS = [
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY-MM-DD",
] as const;
export type AppDateFormat = (typeof APP_DATE_FORMATS)[number];

export type AppSettings = {
  dateFormat: AppDateFormat;
  serviceSchedulingEnabled: boolean;
  updatedAt: number | null;
};

export async function getAppSettings(): Promise<AppSettings> {
  const { settings } = await apiFetch<{ settings: AppSettings }>(
    "/api/app-settings",
  );
  return settings;
}

export async function setDateFormat(
  dateFormat: AppDateFormat,
): Promise<AppSettings> {
  const { settings } = await apiFetch<{ settings: AppSettings }>(
    "/api/app-settings",
    { method: "PATCH", body: { kind: "dateFormat", dateFormat } },
  );
  return settings;
}

export async function setServiceSchedulingEnabled(
  enabled: boolean,
): Promise<AppSettings> {
  const { settings } = await apiFetch<{ settings: AppSettings }>(
    "/api/app-settings",
    { method: "PATCH", body: { kind: "serviceScheduling", enabled } },
  );
  return settings;
}
