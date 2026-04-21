import { apiFetch } from "@/lib/api-client";

import type { AssetStatus } from "./assets";

export const SERVICE_INTERVAL_UNITS = [
  "days",
  "weeks",
  "months",
  "years",
] as const;
export type ServiceIntervalUnit = (typeof SERVICE_INTERVAL_UNITS)[number];

export type ServiceSchedule = {
  id: string;
  assetId: string;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: number;
  reminderLeadUnit: ServiceIntervalUnit;
  reminderStartDate: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
};

export type ScheduledAsset = {
  scheduleId: string;
  assetId: string;
  assetName: string;
  assetTag: string;
  assetStatus: AssetStatus;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: number;
  reminderLeadUnit: ServiceIntervalUnit;
  reminderStartDate: string;
};

type UpsertInput = {
  assetId: string;
  nextServiceDate: string;
  intervalValue: number;
  intervalUnit: ServiceIntervalUnit;
  reminderLeadValue: number;
  reminderLeadUnit: ServiceIntervalUnit;
};

export async function listScheduledAssets(): Promise<ScheduledAsset[]> {
  const { schedules } = await apiFetch<{ schedules: ScheduledAsset[] }>(
    "/api/service-schedules",
  );
  return schedules;
}

export async function upsertSchedule(
  input: UpsertInput,
): Promise<ServiceSchedule> {
  const { schedule } = await apiFetch<{ schedule: ServiceSchedule }>(
    "/api/service-schedules",
    { method: "PUT", body: input },
  );
  return schedule;
}

export async function getScheduleByAssetId(
  assetId: string,
): Promise<ServiceSchedule | null> {
  const { schedule } = await apiFetch<{ schedule: ServiceSchedule | null }>(
    `/api/service-schedules/by-asset/${assetId}`,
  );
  return schedule;
}

export async function deleteSchedule(assetId: string): Promise<void> {
  await apiFetch(`/api/service-schedules/by-asset/${assetId}`, {
    method: "DELETE",
  });
}

export async function listCalendarMonth(
  year: number,
  month: number,
): Promise<ScheduledAsset[]> {
  const { schedules } = await apiFetch<{ schedules: ScheduledAsset[] }>(
    `/api/service-schedules/calendar?year=${year}&month=${month}`,
  );
  return schedules;
}

export async function listUpcomingServices(
  days: number,
): Promise<ScheduledAsset[]> {
  const { schedules } = await apiFetch<{ schedules: ScheduledAsset[] }>(
    `/api/service-schedules/upcoming?days=${days}`,
  );
  return schedules;
}
