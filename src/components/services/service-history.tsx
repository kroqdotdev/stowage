"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Pencil, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { CrudModal } from "@/components/crud/modal";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { ServiceRecordAttachments } from "@/components/services/service-record-attachments";
import { ServiceRecordForm } from "@/components/services/service-record-form";
import type { ServiceRecord } from "@/components/services/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";
import {
  formatDateFromIsoDateOnly,
  formatDateFromTimestamp,
} from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";

function formatCost(value: number | null) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ServiceHistory({ assetId }: { assetId: Id<"assets"> }) {
  const dateFormat = useAppDateFormat();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const schedule = useQuery(api.serviceSchedules.getScheduleByAssetId, {
    assetId,
  });
  const rows = useQuery(api.serviceRecords.listAssetRecords, { assetId });
  const deleteRecord = useMutation(api.serviceRecords.deleteRecord);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [deleteRecordId, setDeleteRecordId] =
    useState<Id<"serviceRecords"> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const records = useMemo(() => (rows ?? []) as ServiceRecord[], [rows]);

  async function handleDeleteRecord() {
    if (!deleteRecordId) {
      return;
    }

    setDeleting(true);
    try {
      await deleteRecord({ recordId: deleteRecordId });
      toast.success("Service record deleted");
      setDeleteRecordId(null);
    } catch (error) {
      toast.error(
        getConvexUiErrorMessage(error, "Unable to delete service record"),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            Service history
          </h3>
          <p className="text-sm text-muted-foreground">
            Manual and scheduled service records for this asset.
          </p>
        </div>

        <Button
          type="button"
          className="cursor-pointer"
          onClick={() => setCreateOpen(true)}
        >
          <Wrench className="h-4 w-4" />
          Log manual service
        </Button>
      </div>

      {schedule ? (
        <div className="mt-4 rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Next due{" "}
                {formatDateFromIsoDateOnly(
                  schedule.nextServiceDate,
                  dateFormat,
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Every {schedule.intervalValue} {schedule.intervalUnit}.
                Reminders start{" "}
                {formatDateFromIsoDateOnly(
                  schedule.reminderStartDate,
                  dateFormat,
                )}
                .
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {rows === undefined || currentUser === undefined ? (
          <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
            Loading service history...
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            No service records yet.
          </div>
        ) : (
          records.map((record) => {
            const canMutate =
              currentUser?.role === "admin" ||
              currentUser?._id === record.completedBy;

            return (
              <details
                key={record._id}
                className="rounded-lg border border-border/60 bg-background p-4"
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                          {formatDateFromIsoDateOnly(
                            record.serviceDate,
                            dateFormat,
                          )}
                        </p>
                        {record.serviceGroupName ? (
                          <Badge className="bg-muted/20">
                            {record.serviceGroupName}
                          </Badge>
                        ) : null}
                        {record.scheduledForDate ? (
                          <Badge className="bg-muted/20">
                            Scheduled for{" "}
                            {formatDateFromIsoDateOnly(
                              record.scheduledForDate,
                              dateFormat,
                            )}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-foreground">
                        {record.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Logged by {record.completedByName} on{" "}
                        {formatDateFromTimestamp(
                          record.completedAt,
                          dateFormat,
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {record.providerName ? (
                        <Badge className="bg-muted/20">
                          {record.providerName}
                        </Badge>
                      ) : null}
                      {record.cost !== null ? (
                        <Badge className="bg-muted/20">
                          Cost {formatCost(record.cost)}
                        </Badge>
                      ) : null}
                      {canMutate ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.preventDefault();
                              setEditRecord(record);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.preventDefault();
                              setDeleteRecordId(record._id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </summary>

                <div className="mt-4 space-y-4">
                  {record.valueEntries.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {record.valueEntries.map((entry) => (
                        <div
                          key={`${record._id}-${entry.fieldId}`}
                          className="rounded-md border border-border/60 bg-muted/10 px-3 py-2"
                        >
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {entry.label}
                          </p>
                          <p className="text-sm">
                            {entry.value === null
                              ? "—"
                              : typeof entry.value === "boolean"
                                ? entry.value
                                  ? "Yes"
                                  : "No"
                                : String(entry.value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <h4 className="text-xs font-semibold tracking-tight">
                      Attachments
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Service reports and proof of work for this record.
                    </p>
                    <div className="mt-2">
                      <ServiceRecordAttachments serviceRecordId={record._id} />
                    </div>
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>

      <CrudModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Log manual service"
        description="Create a service history entry for this asset."
      >
        {createOpen ? (
          <ServiceRecordForm
            key={`create-${assetId}`}
            assetId={assetId}
            mode="create"
          />
        ) : null}
      </CrudModal>

      <CrudModal
        open={editRecord !== null}
        onClose={() => setEditRecord(null)}
        title={editRecord ? `Edit service record` : "Edit service record"}
        description="Update lifecycle details and any required service fields."
      >
        {editRecord ? (
          <ServiceRecordForm
            key={`edit-${editRecord._id}`}
            assetId={assetId}
            mode="edit"
            record={editRecord}
            submitLabel="Save record"
            onSubmitted={() => setEditRecord(null)}
          />
        ) : null}
      </CrudModal>

      <ConfirmDialog
        open={deleteRecordId !== null}
        title="Delete service record"
        description="Delete this service record and all of its attachments?"
        confirmLabel="Delete record"
        busy={deleting}
        onConfirm={handleDeleteRecord}
        onClose={() => setDeleteRecordId(null)}
      />
    </section>
  );
}
