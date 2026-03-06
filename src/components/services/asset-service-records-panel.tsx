"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Wrench } from "lucide-react";
import { ServiceRecordAttachments } from "@/components/services/service-record-attachments";
import { ServiceRecordDynamicForm } from "@/components/services/service-record-dynamic-form";
import type { ServiceRecord } from "@/components/services/types";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";

function valueToText(value: string | number | boolean | null) {
  if (value === null) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

export function AssetServiceRecordsPanel({ assetId }: { assetId: Id<"assets"> }) {
  const dateFormat = useAppDateFormat();
  const rows = useQuery(api.serviceRecords.listAssetRecords, { assetId });
  const records = useMemo(() => (rows ?? []) as ServiceRecord[], [rows]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border/70 bg-muted/10 p-4">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium">
          <Wrench className="h-3.5 w-3.5" />
          Log service record
        </div>
        <ServiceRecordDynamicForm assetId={assetId} />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Service history</h3>
          <p className="text-xs text-muted-foreground">
            Completed records for this asset.
          </p>
        </div>

        {rows === undefined ? (
          <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
            Loading service records...
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            No service records yet.
          </div>
        ) : (
          records.map((record) => (
            <details
              key={record._id}
              className="rounded-lg border border-border/60 bg-background p-4"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{record.serviceGroupName}</p>
                    <p className="text-xs text-muted-foreground">
                      Logged by {record.completedByName} on{" "}
                      {formatDateFromTimestamp(record.completedAt, dateFormat)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.scheduledForDate ? (
                      <Badge className="bg-muted/20">
                        Due {record.scheduledForDate}
                      </Badge>
                    ) : null}
                    <Badge className="bg-muted/20">
                      {Object.keys(record.values).length} values
                    </Badge>
                  </div>
                </div>
              </summary>

              <div className="mt-4 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(record.values).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No fields were captured for this record.
                    </p>
                  ) : (
                    Object.entries(record.values).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-md border border-border/60 bg-muted/10 px-3 py-2"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {key}
                        </p>
                        <p className="text-sm">{valueToText(value)}</p>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold tracking-tight">Attachments</h4>
                  <p className="text-xs text-muted-foreground">
                    Service reports and proof of work for this record.
                  </p>
                  <div className="mt-2">
                    <ServiceRecordAttachments serviceRecordId={record._id} />
                  </div>
                </div>
              </div>
            </details>
          ))
        )}
      </section>
    </div>
  );
}
