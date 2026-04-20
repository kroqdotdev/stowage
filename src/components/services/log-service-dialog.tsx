"use client";

import { CrudModal } from "@/components/crud/modal";
import { ServiceRecordForm } from "@/components/services/service-record-form";

export function LogServiceDialog({
  open,
  assetId,
  assetName,
  scheduleId,
  onClose,
}: {
  open: boolean;
  assetId: string | null;
  assetName: string | null;
  scheduleId: string | null;
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
          onSubmitted={() => onClose()}
        />
      ) : null}
    </CrudModal>
  );
}
