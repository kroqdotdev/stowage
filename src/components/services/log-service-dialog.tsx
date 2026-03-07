"use client";

import { CrudModal } from "@/components/crud/modal";
import { ServiceRecordForm } from "@/components/services/service-record-form";
import type { Id } from "@/lib/convex-api";

export function LogServiceDialog({
  open,
  assetId,
  assetName,
  scheduleId,
  onClose,
}: {
  open: boolean;
  assetId: Id<"assets"> | null;
  assetName: string | null;
  scheduleId: Id<"serviceSchedules"> | null;
  onClose: () => void;
}) {
  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title={assetName ? `Log service: ${assetName}` : "Log service"}
      description="Complete the lifecycle fields, any required service-group fields, and attach supporting files if needed."
    >
      {open && assetId && scheduleId ? (
        <ServiceRecordForm
          key={`${scheduleId}-${assetId}`}
          assetId={assetId}
          mode="complete"
          scheduleId={scheduleId}
        />
      ) : null}
    </CrudModal>
  );
}
