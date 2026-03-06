"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { ServiceRecordAttachments } from "@/components/services/service-record-attachments";
import type { ServiceRecordFormDefinition } from "@/components/services/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";

type RecordValue = string | number | boolean | null;

function isMissingValue(value: RecordValue | undefined) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return false;
}

function isFieldValid(
  field: ServiceRecordFormDefinition["fields"][number],
  value: RecordValue | undefined,
) {
  if (field.fieldType === "checkbox") {
    return typeof value === "boolean";
  }

  if (isMissingValue(value)) {
    return false;
  }

  if (field.fieldType === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (typeof value !== "string") {
    return false;
  }

  if (field.fieldType === "select") {
    return field.options.includes(value);
  }

  return value.trim().length > 0;
}

export function ServiceRecordDynamicForm({
  assetId,
  scheduledForDate,
  onCreated,
}: {
  assetId: Id<"assets">;
  scheduledForDate?: string | null;
  onCreated?: (recordId: Id<"serviceRecords">) => void;
}) {
  const formDefinitionQuery = useQuery(api.serviceRecords.getRecordFormDefinition, {
    assetId,
  });
  const createRecord = useMutation(api.serviceRecords.createRecord);

  const [values, setValues] = useState<Record<string, RecordValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdRecordId, setCreatedRecordId] =
    useState<Id<"serviceRecords"> | null>(null);

  const formDefinition = formDefinitionQuery as ServiceRecordFormDefinition | null | undefined;

  const canSubmit = useMemo(() => {
    if (!formDefinition || submitting) {
      return false;
    }

    return formDefinition.fields.every((field) => {
      if (!field.required) {
        return true;
      }
      return isFieldValid(field, values[field._id]);
    });
  }, [formDefinition, submitting, values]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formDefinition) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await createRecord({
        assetId,
        values,
        scheduledForDate: scheduledForDate ?? formDefinition.nextServiceDate ?? null,
      });
      setCreatedRecordId(result.recordId);
      setValues({});
      toast.success("Service record logged");
      onCreated?.(result.recordId);
    } catch (error) {
      toast.error(getConvexUiErrorMessage(error, "Unable to log service record"));
    } finally {
      setSubmitting(false);
    }
  }

  if (formDefinitionQuery === undefined) {
    return (
      <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
        Loading service record form...
      </div>
    );
  }

  if (!formDefinition) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        This asset has no service group assigned. Assign one on{" "}
        <Link
          href={`/assets/${assetId}/edit`}
          className="text-primary underline-offset-2 hover:underline"
        >
          Edit asset
        </Link>{" "}
        before logging service records.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-border/70 bg-background text-xs">
            {formDefinition.assetTag}
          </Badge>
          <span>{formDefinition.assetName}</span>
          <span>•</span>
          <span>{formDefinition.serviceGroupName}</span>
          {formDefinition.nextServiceDate ? (
            <>
              <span>•</span>
              <span>Next due {formDefinition.nextServiceDate}</span>
            </>
          ) : null}
        </div>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        {formDefinition.fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            This group has no required fields. You can submit a record directly.
          </div>
        ) : (
          formDefinition.fields.map((field) => {
            const value = values[field._id];
            const fieldInputId = `service-record-field-${field._id}`;
            const requiredMarker = field.required ? (
              <span className="ml-1 text-destructive">*</span>
            ) : null;

            if (field.fieldType === "textarea") {
              return (
                <div key={field._id} className="space-y-1.5">
                  <label htmlFor={fieldInputId} className="text-sm font-medium">
                    {field.label}
                    {requiredMarker}
                  </label>
                  <Textarea
                    id={fieldInputId}
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field._id]: event.target.value,
                      }))
                    }
                    className="min-h-24"
                  />
                </div>
              );
            }

            if (field.fieldType === "number") {
              return (
                <div key={field._id} className="space-y-1.5">
                  <label htmlFor={fieldInputId} className="text-sm font-medium">
                    {field.label}
                    {requiredMarker}
                  </label>
                  <Input
                    id={fieldInputId}
                    type="number"
                    value={typeof value === "number" ? String(value) : ""}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setValues((prev) => ({
                        ...prev,
                        [field._id]:
                          event.target.value.trim() === ""
                            ? null
                            : Number.isFinite(parsed)
                              ? parsed
                              : null,
                      }));
                    }}
                  />
                </div>
              );
            }

            if (field.fieldType === "date") {
              return (
                <div key={field._id} className="space-y-1.5">
                  <label htmlFor={fieldInputId} className="text-sm font-medium">
                    {field.label}
                    {requiredMarker}
                  </label>
                  <Input
                    id={fieldInputId}
                    type="date"
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field._id]: event.target.value,
                      }))
                    }
                  />
                </div>
              );
            }

            if (field.fieldType === "checkbox") {
              return (
                <div key={field._id} className="flex items-center gap-2">
                  <input
                    id={fieldInputId}
                    type="checkbox"
                    className="h-4 w-4 rounded border border-input"
                    checked={typeof value === "boolean" ? value : false}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field._id]: event.target.checked,
                      }))
                    }
                  />
                  <label htmlFor={fieldInputId} className="text-sm font-medium">
                    {field.label}
                    {requiredMarker}
                  </label>
                </div>
              );
            }

            if (field.fieldType === "select") {
              return (
                <div key={field._id} className="space-y-1.5">
                  <label htmlFor={fieldInputId} className="text-sm font-medium">
                    {field.label}
                    {requiredMarker}
                  </label>
                  <select
                    id={fieldInputId}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [field._id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select an option</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={field._id} className="space-y-1.5">
                <label htmlFor={fieldInputId} className="text-sm font-medium">
                  {field.label}
                  {requiredMarker}
                </label>
                <Input
                  id={fieldInputId}
                  value={typeof value === "string" ? value : ""}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [field._id]: event.target.value,
                    }))
                  }
                />
              </div>
            );
          })
        )}

        <Button type="submit" className="cursor-pointer" disabled={!canSubmit}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
          Log service record
        </Button>
      </form>

      {createdRecordId ? (
        <section className="rounded-xl border border-border/70 bg-background p-4">
          <h4 className="text-sm font-semibold tracking-tight">Record attachments</h4>
          <p className="text-xs text-muted-foreground">
            Attach optional service reports, photos, or documents.
          </p>
          <div className="mt-3">
            <ServiceRecordAttachments serviceRecordId={createdRecordId} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
