"use client";

import { ServiceRecordForm } from "@/components/services/service-record-form";

export function ServiceRecordDynamicForm({
  assetId,
  onCreated,
}: {
  assetId: string;
  scheduledForDate?: string | null;
  onCreated?: (recordId: string) => void;
}) {
  return (
    <ServiceRecordForm
      assetId={assetId}
      onSubmitted={({ recordId }) => onCreated?.(recordId)}
    />
  );
}
