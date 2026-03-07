"use client";

import { ServiceRecordForm } from "@/components/services/service-record-form";
import type { Id } from "@/lib/convex-api";

export function ServiceRecordDynamicForm({
  assetId,
  onCreated,
}: {
  assetId: Id<"assets">;
  scheduledForDate?: string | null;
  onCreated?: (recordId: Id<"serviceRecords">) => void;
}) {
  return (
    <ServiceRecordForm
      assetId={assetId}
      onSubmitted={({ recordId }) => onCreated?.(recordId)}
    />
  );
}
