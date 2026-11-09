"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { CrudModal } from "@/components/crud/modal";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { ServiceRecordAttachments } from "@/components/services/service-record-attachments";
import { ServiceRecordForm } from "@/components/services/service-record-form";
import type { ServiceRecord } from "@/components/services/types";
import { Button } from "@/components/ui/button";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  deleteServiceRecord,
  listAssetServiceRecords,
} from "@/lib/api/service-records";
import { formatDateFromIsoDateOnly } from "@/lib/date-format";
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

/*
  Service history: a sheet on the concrete under the 2px rule, drawn as a
  timeline. Date, ink marker, then what was done and by whom. Fields, files
  and record actions open per entry.
*/
export function ServiceHistory({
  assetId,
  showLogAction = true,
}: {
  assetId: string;
  /* The Next service card owns "Log service…"; this is the off-plan entry. */
  showLogAction?: boolean;
}) {
  const dateFormat = useAppDateFormat();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const recordsQuery = useQuery({
    queryKey: ["service-records", "by-asset", assetId],
    queryFn: () => listAssetServiceRecords(assetId),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => deleteServiceRecord(recordId),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  const records = useMemo(
    () => (recordsQuery.data ?? []) as ServiceRecord[],
    [recordsQuery.data],
  );

  async function handleDeleteRecord() {
    if (!deleteRecordId) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteRecordId);
      toast.success("Service record deleted");
      setDeleteRecordId(null);
      void queryClient.invalidateQueries({
        queryKey: ["service-records", "by-asset", assetId],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete service record"));
    }
  }

  return (
    <section data-testid="service-history">
      <SheetHeading
        title="Service history"
        count={records.length > 0 ? records.length : undefined}
        aside={
          showLogAction ? (
            <button
              type="button"
              className="cursor-pointer underline underline-offset-[3px] hover:text-foreground"
              onClick={() => setCreateOpen(true)}
            >
              Log other service…
            </button>
          ) : null
        }
      />

      {recordsQuery.isPending ? (
        <div className="space-y-3 py-4">
          <Skeleton className="h-2.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      ) : records.length === 0 ? (
        <p className="px-0.5 py-4 text-sm text-ink-2">No service records yet.</p>
      ) : (
        <ol className="relative pt-3">
          {records.map((record, index) => {
            const canMutate =
              currentUser?.role === "admin" ||
              currentUser?.id === record.completedBy;
            const last = index === records.length - 1;
            const meta = [
              record.providerName,
              record.cost !== null ? `Cost ${formatCost(record.cost)}` : null,
              record.scheduledForDate
                ? `Due ${formatDateFromIsoDateOnly(record.scheduledForDate, dateFormat)}`
                : null,
            ].filter(Boolean);

            return (
              <li
                key={record.id}
                className="relative grid grid-cols-[18px_minmax(0,1fr)] gap-x-3 pb-6 md:grid-cols-[96px_18px_minmax(0,1fr)]"
              >
                <span className="pt-px text-right text-sm whitespace-nowrap text-ink-2 max-md:hidden">
                  {formatDateFromIsoDateOnly(record.serviceDate, dateFormat)}
                </span>
                <span aria-hidden="true" className="relative flex justify-center">
                  <span className="relative z-10 mt-[5px] size-2.5 rounded-[1px] bg-foreground" />
                  {last ? null : (
                    <span className="absolute top-[15px] -bottom-[5px] w-px bg-line-2" />
                  )}
                </span>
                <div className="min-w-0">
                  <span className="mb-0.5 block text-sm text-ink-2 md:hidden">
                    {formatDateFromIsoDateOnly(record.serviceDate, dateFormat)}
                  </span>
                  <p className="text-sm">
                    <b className="font-semibold text-foreground">
                      {record.serviceGroupName ?? "Service"}
                    </b>{" "}
                    <span className="text-muted-foreground">by {record.completedByName}</span>
                  </p>
                  {record.description ? (
                    <p className="mt-0.5 text-sm whitespace-pre-wrap text-ink-2">
                      {record.description}
                    </p>
                  ) : null}
                  {meta.length > 0 ? (
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {meta.join(" · ")}
                    </p>
                  ) : null}

                  <details className="group mt-1.5">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-ink-2 underline underline-offset-[3px] hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">Fields and files</span>
                      <span className="hidden group-open:inline">Hide fields and files</span>
                    </summary>
                    <div className="mt-3 space-y-3 rounded-md border border-border bg-card p-3.5">
                      {record.valueEntries.length > 0 ? (
                        <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                          {record.valueEntries.map((entry) => (
                            <div key={`${record.id}-${entry.fieldId}`}>
                              <dt className="text-[13px] text-ink-2">{entry.label}</dt>
                              <dd className="text-sm font-medium text-foreground">
                                {entry.value === null
                                  ? "—"
                                  : typeof entry.value === "boolean"
                                    ? entry.value
                                      ? "Yes"
                                      : "No"
                                    : String(entry.value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                      <ServiceRecordAttachments serviceRecordId={record.id} />
                      {canMutate ? (
                        <div className="flex gap-2 border-t border-border pt-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditRecord(record)}
                          >
                            <Pencil />
                            Edit…
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteRecordId(record.id)}
                          >
                            <Trash2 />
                            Delete…
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </details>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <CrudModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Log other service"
        description="Adds an entry to this asset's service history. If the asset is on a schedule, the next service moves to one interval after this service date."
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
        title="Edit service record"
        description="Update lifecycle details and any required service fields."
      >
        {editRecord ? (
          <ServiceRecordForm
            key={`edit-${editRecord.id}`}
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
        title="Delete service record?"
        description="The record and all of its files are deleted."
        confirmLabel="Delete record"
        busy={deleteMutation.isPending}
        onConfirm={handleDeleteRecord}
        onClose={() => setDeleteRecordId(null)}
      />
    </section>
  );
}
