"use client";

import { useMemo, useState } from "react";
import { Loader2, Paperclip, Wrench } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { ServiceRecordAttachments } from "@/components/services/service-record-attachments";
import type {
  ServiceProviderOption,
  ServiceRecord,
  ServiceRecordFormDefinition,
} from "@/components/services/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listServiceProviderOptions } from "@/lib/api/service-providers";
import {
  completeScheduledService,
  createServiceRecord,
  getServiceRecordForm,
  updateServiceRecord,
} from "@/lib/api/service-records";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

type RecordValue = string | number | boolean | null;

type ServiceRecordFormProps = {
  assetId: string;
  mode?: "create" | "edit" | "complete";
  record?: ServiceRecord | null;
  scheduleId?: string | null;
  submitLabel?: string;
  onSubmitted?: (result: {
    recordId: string;
    nextServiceDate?: string | null;
  }) => void;
};

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

function buildInitialValues(record?: ServiceRecord | null) {
  return { ...(record?.values ?? {}) } as Record<string, RecordValue>;
}

export function ServiceRecordForm({
  assetId,
  mode = "create",
  record = null,
  scheduleId = null,
  submitLabel,
  onSubmitted,
}: ServiceRecordFormProps) {
  const today = useTodayIsoDate();
  const queryClient = useQueryClient();

  const formDefinitionQuery = useQuery({
    queryKey: ["service-records", "form", assetId, record?.id ?? null],
    queryFn: () => getServiceRecordForm(assetId, record?.id),
  });
  const providerOptionsQuery = useQuery({
    queryKey: ["service-providers", "options"],
    queryFn: listServiceProviderOptions,
  });

  const createMutation = useMutation({ mutationFn: createServiceRecord });
  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      input,
    }: {
      recordId: string;
      input: Parameters<typeof updateServiceRecord>[1];
    }) => updateServiceRecord(recordId, input),
  });
  const completeMutation = useMutation({
    mutationFn: completeScheduledService,
  });

  const [serviceDate, setServiceDate] = useState(record?.serviceDate ?? today);
  const [description, setDescription] = useState(record?.description ?? "");
  const [costInput, setCostInput] = useState(
    record?.cost === null || record?.cost === undefined
      ? ""
      : String(record.cost),
  );
  const [providerId, setProviderId] = useState<string | null>(
    record?.providerId ?? null,
  );
  const [values, setValues] = useState<Record<string, RecordValue>>(
    buildInitialValues(record),
  );
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(
    record?.id ?? null,
  );

  const formDefinition = formDefinitionQuery.data as
    | ServiceRecordFormDefinition
    | undefined;
  const providerOptions = useMemo(
    () => (providerOptionsQuery.data ?? []) as ServiceProviderOption[],
    [providerOptionsQuery.data],
  );

  const cost = useMemo(() => {
    if (costInput.trim() === "") {
      return null;
    }
    const parsed = Number(costInput);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }, [costInput]);

  const submitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    completeMutation.isPending;

  const isSaved = currentRecordId !== null && mode !== "edit";
  const effectiveSubmitLabel =
    submitLabel ??
    (mode === "edit"
      ? "Save changes"
      : mode === "complete"
        ? "Complete service"
        : "Log service");

  const canSubmit = useMemo(() => {
    if (!formDefinition || submitting || isSaved) {
      return false;
    }

    if (!serviceDate || description.trim() === "") {
      return false;
    }

    if (Number.isNaN(cost)) {
      return false;
    }

    return formDefinition.fields.every((field) => {
      if (!field.required) {
        return true;
      }
      return isFieldValid(field, values[field.id]);
    });
  }, [
    cost,
    description,
    formDefinition,
    isSaved,
    serviceDate,
    submitting,
    values,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formDefinition || !canSubmit) {
      return;
    }

    try {
      if (mode === "edit" && record) {
        await updateMutation.mutateAsync({
          recordId: record.id,
          input: {
            serviceDate,
            description,
            cost,
            providerId,
            values,
          },
        });
        toast.success("Service record updated");
        onSubmitted?.({ recordId: record.id, nextServiceDate: null });
        void queryClient.invalidateQueries({
          queryKey: ["service-records", "by-asset", assetId],
        });
        return;
      }

      if (mode === "complete" && scheduleId) {
        const result = await completeMutation.mutateAsync({
          scheduleId,
          serviceDate,
          description,
          cost,
          providerId,
          values,
        });
        setCurrentRecordId(result.recordId);
        toast.success("Service completed");
        onSubmitted?.(result);
        void queryClient.invalidateQueries({
          queryKey: ["service-records", "by-asset", assetId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["service-schedules"],
        });
        return;
      }

      const result = await createMutation.mutateAsync({
        assetId,
        serviceDate,
        description,
        cost,
        providerId,
        values,
      });
      setCurrentRecordId(result.recordId);
      toast.success("Service record logged");
      onSubmitted?.({ recordId: result.recordId, nextServiceDate: null });
      void queryClient.invalidateQueries({
        queryKey: ["service-records", "by-asset", assetId],
      });
    } catch (error) {
      toast.error(
        getConvexUiErrorMessage(error, "Unable to save service record"),
      );
    }
  }

  if (formDefinitionQuery.isPending || providerOptionsQuery.isPending) {
    return (
      <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
        Loading service record form...
      </div>
    );
  }

  if (!formDefinition) {
    return (
      <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
        Unable to load service record form for this asset.
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
          {formDefinition.serviceGroupName ? (
            <>
              <span>•</span>
              <span>{formDefinition.serviceGroupName}</span>
            </>
          ) : null}
          {scheduleId && formDefinition.nextServiceDate ? (
            <>
              <span>•</span>
              <span>Scheduled for {formDefinition.nextServiceDate}</span>
            </>
          ) : null}
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="service-record-service-date"
              className="text-sm font-medium"
            >
              Service date
              <span className="ml-1 text-destructive">*</span>
            </label>
            <Input
              id="service-record-service-date"
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
              disabled={isSaved || submitting}
            />
            {serviceDate === today ? (
              <p className="text-xs text-muted-foreground">
                Using today will treat this as a service performed now.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="service-record-provider"
              className="text-sm font-medium"
            >
              Provider
            </label>
            <Select
              value={providerId ?? "__none__"}
              onValueChange={(value) =>
                setProviderId(value === "__none__" ? null : value)
              }
              disabled={isSaved || submitting}
            >
              <SelectTrigger id="service-record-provider">
                <SelectValue placeholder="No provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No provider</SelectItem>
                {providerOptions.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="service-record-description"
            className="text-sm font-medium"
          >
            Description
            <span className="ml-1 text-destructive">*</span>
          </label>
          <Textarea
            id="service-record-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24"
            disabled={isSaved || submitting}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="service-record-cost" className="text-sm font-medium">
            Cost
          </label>
          <Input
            id="service-record-cost"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={costInput}
            onChange={(event) => setCostInput(event.target.value)}
            disabled={isSaved || submitting}
          />
        </div>

        {formDefinition.fields.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4" />
              Configurable service fields
            </div>

            {formDefinition.fields.map((field) => {
              const value = values[field.id];
              const fieldInputId = `service-record-field-${field.id}`;
              const requiredMarker = field.required ? (
                <span className="ml-1 text-destructive">*</span>
              ) : null;

              if (field.fieldType === "textarea") {
                return (
                  <div key={field.id} className="space-y-1.5">
                    <label
                      htmlFor={fieldInputId}
                      className="text-sm font-medium"
                    >
                      {field.label}
                      {requiredMarker}
                    </label>
                    <Textarea
                      id={fieldInputId}
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.id]: event.target.value,
                        }))
                      }
                      className="min-h-24"
                      disabled={isSaved || submitting}
                    />
                  </div>
                );
              }

              if (field.fieldType === "number") {
                return (
                  <div key={field.id} className="space-y-1.5">
                    <label
                      htmlFor={fieldInputId}
                      className="text-sm font-medium"
                    >
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
                          [field.id]:
                            event.target.value.trim() === ""
                              ? null
                              : Number.isFinite(parsed)
                                ? parsed
                                : null,
                        }));
                      }}
                      disabled={isSaved || submitting}
                    />
                  </div>
                );
              }

              if (field.fieldType === "date") {
                return (
                  <div key={field.id} className="space-y-1.5">
                    <label
                      htmlFor={fieldInputId}
                      className="text-sm font-medium"
                    >
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
                          [field.id]: event.target.value,
                        }))
                      }
                      disabled={isSaved || submitting}
                    />
                  </div>
                );
              }

              if (field.fieldType === "checkbox") {
                return (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      id={fieldInputId}
                      type="checkbox"
                      className="h-4 w-4 rounded border border-input"
                      checked={typeof value === "boolean" ? value : false}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.id]: event.target.checked,
                        }))
                      }
                      disabled={isSaved || submitting}
                    />
                    <label
                      htmlFor={fieldInputId}
                      className="text-sm font-medium"
                    >
                      {field.label}
                      {requiredMarker}
                    </label>
                  </div>
                );
              }

              if (field.fieldType === "select") {
                return (
                  <div key={field.id} className="space-y-1.5">
                    <label
                      htmlFor={fieldInputId}
                      className="text-sm font-medium"
                    >
                      {field.label}
                      {requiredMarker}
                    </label>
                    <Select
                      value={typeof value === "string" ? value : "__empty__"}
                      onValueChange={(nextValue) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.id]:
                            nextValue === "__empty__" ? null : nextValue,
                        }))
                      }
                      disabled={isSaved || submitting}
                    >
                      <SelectTrigger id={fieldInputId}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">None</SelectItem>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-1.5">
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
                        [field.id]: event.target.value,
                      }))
                    }
                    disabled={isSaved || submitting}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            No configurable service fields are required for this asset.
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={!canSubmit}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {effectiveSubmitLabel}
          </Button>
          {isSaved ? (
            <p className="text-sm text-muted-foreground">
              Record saved. Add attachments below before closing.
            </p>
          ) : null}
        </div>
      </form>

      {currentRecordId ? (
        <section className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4" />
            Service record attachments
          </div>
          <p className="text-xs text-muted-foreground">
            Upload service reports or proof of work for this record.
          </p>
          <ServiceRecordAttachments serviceRecordId={currentRecordId} />
        </section>
      ) : null}
    </div>
  );
}
