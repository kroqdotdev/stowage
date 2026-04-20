import { apiFetch } from "@/lib/api-client";

export type ServiceRecordValue = string | number | boolean | null;

export type ServiceRecordFieldDefinition = {
  id: string;
  label: string;
  fieldType: "text" | "textarea" | "number" | "date" | "checkbox" | "select";
  required: boolean;
  options: string[];
  sortOrder: number;
};

export type ServiceRecordForm = {
  assetId: string;
  assetName: string;
  assetTag: string;
  serviceGroupId: string | null;
  serviceGroupName: string | null;
  fields: ServiceRecordFieldDefinition[];
};

export type ServiceRecord = {
  id: string;
  assetId: string;
  serviceGroupId: string | null;
  serviceGroupName: string | null;
  scheduleId: string | null;
  scheduledForDate: string | null;
  serviceDate: string | null;
  description: string | null;
  cost: number | null;
  providerId: string | null;
  providerName: string | null;
  completedBy: string;
  completedAt: number;
  createdAt: number;
  updatedAt: number;
  valueEntries: Array<{
    fieldId: string;
    label: string;
    fieldType: string;
    value: ServiceRecordValue;
  }>;
};

type CreateInput = {
  assetId: string;
  serviceDate: string;
  description: string;
  cost?: number | null;
  providerId?: string | null;
  values?: Record<string, ServiceRecordValue>;
};

type UpdateInput = {
  serviceDate: string;
  description: string;
  cost?: number | null;
  providerId?: string | null;
  values?: Record<string, ServiceRecordValue>;
};

type CompleteInput = {
  scheduleId: string;
  serviceDate: string;
  description: string;
  cost?: number | null;
  providerId?: string | null;
  values?: Record<string, ServiceRecordValue>;
};

export async function getServiceRecordForm(
  assetId: string,
): Promise<ServiceRecordForm> {
  const { form } = await apiFetch<{ form: ServiceRecordForm }>(
    `/api/service-records/form/${assetId}`,
  );
  return form;
}

export async function listAssetServiceRecords(
  assetId: string,
): Promise<ServiceRecord[]> {
  const { records } = await apiFetch<{ records: ServiceRecord[] }>(
    `/api/service-records/by-asset/${assetId}`,
  );
  return records;
}

export async function createServiceRecord(
  input: CreateInput,
): Promise<{ recordId: string }> {
  return apiFetch<{ recordId: string }>("/api/service-records", {
    method: "POST",
    body: input,
  });
}

export async function updateServiceRecord(
  recordId: string,
  input: UpdateInput,
): Promise<void> {
  await apiFetch(`/api/service-records/${recordId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteServiceRecord(recordId: string): Promise<void> {
  await apiFetch(`/api/service-records/${recordId}`, { method: "DELETE" });
}

export async function completeScheduledService(
  input: CompleteInput,
): Promise<{ recordId: string; nextServiceDate: string }> {
  return apiFetch<{ recordId: string; nextServiceDate: string }>(
    "/api/service-records/complete-scheduled",
    { method: "POST", body: input },
  );
}
