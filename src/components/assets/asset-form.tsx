"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DynamicField } from "@/components/fields/dynamic-field";
import type { FieldDefinition, FieldValue } from "@/components/fields/types";
import {
  LocationPicker,
  type LocationPickerOption,
} from "@/components/locations/location-picker";
import { TagPicker, type TagPickerOption } from "@/components/tags/tag-picker";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetFormValues,
  type AssetStatus,
  type ServiceScheduleDraft,
} from "@/components/assets/types";
import { ServiceScheduleFields } from "@/components/assets/service-schedule-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { TagChip } from "@/components/ui/tag-chip";
import { Textarea } from "@/components/ui/textarea";
import { previewAssetTag } from "@/lib/api/assets";
import { cn } from "@/lib/utils";

type CategoryOption = {
  id: string;
  name: string;
  prefix: string | null;
  color: string;
};

type ServiceGroupOption = {
  id: string;
  name: string;
};

function isEmptyValue(value: FieldValue) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  return false;
}

export function AssetForm({
  mode,
  categories,
  locations,
  serviceGroups,
  tags,
  fieldDefinitions,
  initialValues,
  assetTag,
  submitting,
  submitLabel,
  cancelHref,
  serviceSchedulingEnabled,
  serviceScheduleDraft,
  onServiceScheduleChange,
  onClearServiceSchedule,
  onSubmit,
}: {
  mode: "create" | "edit";
  categories: CategoryOption[];
  locations: LocationPickerOption[];
  serviceGroups: ServiceGroupOption[];
  tags: TagPickerOption[];
  fieldDefinitions: FieldDefinition[];
  initialValues: AssetFormValues;
  assetTag?: string | null;
  submitting: boolean;
  submitLabel: string;
  /* Where Cancel goes; omit to hide it. */
  cancelHref?: string;
  serviceSchedulingEnabled?: boolean;
  serviceScheduleDraft?: ServiceScheduleDraft;
  onServiceScheduleChange?: (next: ServiceScheduleDraft) => void;
  onClearServiceSchedule?: () => void;
  onSubmit: (values: AssetFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<AssetFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const previewQuery = useQuery({
    queryKey: ["assets", "preview-tag", values.categoryId ?? null],
    queryFn: () => previewAssetTag(values.categoryId ?? null),
    enabled: mode === "create",
  });

  const activeAssetTag =
    mode === "create"
      ? (previewQuery.data?.assetTag ?? "Generating...")
      : (assetTag ?? "—");
  const showTagLoading = mode === "create" && previewQuery.isPending;

  const fieldDefinitionsById = useMemo(
    () =>
      new Map(
        fieldDefinitions.map((definition) => [
          definition.id as string,
          definition,
        ]),
      ),
    [fieldDefinitions],
  );

  function setFieldValue(
    field: keyof AssetFormValues,
    nextValue: AssetFormValues[typeof field],
  ) {
    setValues((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function setCustomFieldValue(fieldId: string, value: FieldValue) {
    setValues((prev) => ({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [fieldId]: value as string | number | boolean | null,
      },
    }));

    setErrors((prev) => {
      if (!prev[`custom:${fieldId}`]) {
        return prev;
      }

      const next = { ...prev };
      delete next[`custom:${fieldId}`];
      return next;
    });
  }

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!values.name.trim()) {
      nextErrors.name = "Name is required";
    }

    for (const definition of fieldDefinitions) {
      if (!definition.required) {
        continue;
      }

      const fieldId = definition.id as string;
      const value = values.customFieldValues[fieldId];

      if (definition.fieldType === "checkbox") {
        if (value === null || value === undefined) {
          nextErrors[`custom:${fieldId}`] = `${definition.name} is required`;
        }
        continue;
      }

      if (isEmptyValue(value)) {
        nextErrors[`custom:${fieldId}`] = `${definition.name} is required`;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      ...values,
      name: values.name.trim(),
      notes: values.notes,
      customFieldValues: Object.fromEntries(
        Object.entries(values.customFieldValues).filter(([fieldId, value]) => {
          const definition = fieldDefinitionsById.get(fieldId);
          if (!definition) {
            return false;
          }

          if (definition.fieldType === "checkbox") {
            return value !== null && value !== undefined;
          }

          return !isEmptyValue(value);
        }),
      ),
    });
  }

  const sectionGrid = "grid gap-x-6 gap-y-4 px-0.5 pt-4 sm:grid-cols-2";

  return (
    <form
      className="max-w-[880px] space-y-10"
      onSubmit={handleSubmit}
      noValidate
    >
      <section aria-labelledby="asset-form-details">
        <SheetHeading title={<span id="asset-form-details">Details</span>} />
        <div className={sectionGrid}>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="asset-name" className="text-sm font-semibold">
              Name
            </label>
            <Input
              id="asset-name"
              value={values.name}
              onChange={(event) => setFieldValue("name", event.target.value)}
              placeholder="Festool TS 55 plunge saw"
              disabled={submitting}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "asset-name-error" : undefined}
            />
            {errors.name ? (
              <FieldError id="asset-name-error">{errors.name}</FieldError>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <OptionalLabel id="asset-category-label">Category</OptionalLabel>
            <Select
              value={values.categoryId ?? "__none__"}
              onValueChange={(value) =>
                setFieldValue("categoryId", value === "__none__" ? null : value)
              }
              disabled={submitting}
            >
              <SelectTrigger
                className="w-full"
                aria-labelledby="asset-category-label"
              >
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <span id="asset-tag-label" className="block text-sm font-semibold">
              Tag
            </span>
            <div
              className="flex h-9 items-center gap-2.5"
              aria-labelledby="asset-tag-label"
              role="group"
            >
              {showTagLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <TagChip>{activeAssetTag}</TagChip>
              )}
              <span className="text-[13px] text-muted-foreground">
                {mode === "create"
                  ? "Assigned from the category prefix when you save."
                  : "Printed on the label. It does not change."}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-location" className="text-sm font-semibold">
              Location{" "}
              <span className="font-normal text-muted-foreground">
                optional
              </span>
            </label>
            <LocationPicker
              id="asset-location"
              value={values.locationId}
              options={locations}
              onChange={(locationId) => setFieldValue("locationId", locationId)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-status" className="text-sm font-semibold">
              Status
            </label>
            <Select
              value={values.status}
              onValueChange={(value) =>
                setFieldValue("status", value as AssetStatus)
              }
              disabled={submitting}
            >
              <SelectTrigger id="asset-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ASSET_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="asset-service-group"
              className="text-sm font-semibold"
            >
              Service plan{" "}
              <span className="font-normal text-muted-foreground">
                optional
              </span>
            </label>
            <Select
              value={values.serviceGroupId ?? "__none__"}
              onValueChange={(value) =>
                setFieldValue(
                  "serviceGroupId",
                  value === "__none__" ? null : value,
                )
              }
              disabled={submitting}
            >
              <SelectTrigger id="asset-service-group" className="w-full">
                <SelectValue placeholder="No service plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No service plan</SelectItem>
                {serviceGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <OptionalLabel id="asset-keywords-label">Keywords</OptionalLabel>
            <TagPicker
              value={values.tagIds}
              options={tags}
              onChange={(tagIds) => setFieldValue("tagIds", tagIds)}
              disabled={submitting}
              labelledBy="asset-keywords-label"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="asset-notes" className="text-sm font-semibold">
              Notes{" "}
              <span className="font-normal text-muted-foreground">
                optional
              </span>
            </label>
            <Textarea
              id="asset-notes"
              value={values.notes}
              onChange={(event) => setFieldValue("notes", event.target.value)}
              placeholder="Serial number, quirks, who to ask"
              className="min-h-24"
              disabled={submitting}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="asset-form-custom-fields">
        <SheetHeading
          title={<span id="asset-form-custom-fields">Custom fields</span>}
        />
        {fieldDefinitions.length === 0 ? (
          <p className="px-0.5 py-4 text-sm text-ink-2">
            No custom fields defined.{" "}
            <Link
              href="/taxonomy?tab=fields"
              className="font-medium text-foreground underline underline-offset-[3px]"
            >
              Open Taxonomy
            </Link>
          </p>
        ) : (
          <div className={sectionGrid}>
            {fieldDefinitions.map((definition) => {
              const fieldId = definition.id as string;

              return (
                <div key={definition.id} className="space-y-1.5">
                  <DynamicField
                    definition={definition}
                    value={values.customFieldValues[fieldId] ?? null}
                    onChange={(value) => setCustomFieldValue(fieldId, value)}
                    disabled={submitting}
                  />
                  {errors[`custom:${fieldId}`] ? (
                    <FieldError>{errors[`custom:${fieldId}`]}</FieldError>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {serviceSchedulingEnabled &&
      serviceScheduleDraft &&
      onServiceScheduleChange &&
      onClearServiceSchedule ? (
        <ServiceScheduleFields
          value={serviceScheduleDraft}
          disabled={submitting}
          onChange={onServiceScheduleChange}
          onClear={onClearServiceSchedule}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 max-sm:flex-col-reverse max-sm:items-stretch">
        <Button type="submit" disabled={submitting} className="max-sm:h-11">
          {submitting ? <Loader2 className="animate-spin" /> : null}
          {submitLabel}
        </Button>
        {cancelHref ? (
          <Button
            asChild
            variant="secondary"
            className={cn(
              "max-sm:h-11",
              submitting && "pointer-events-none opacity-50",
            )}
          >
            <Link href={cancelHref}>Cancel</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function OptionalLabel({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <span className="block text-sm font-semibold">
      <span id={id}>{children}</span>{" "}
      <span className="font-normal text-muted-foreground">optional</span>
    </span>
  );
}

function FieldError({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      className="flex items-start gap-1.5 text-sm font-medium text-destructive"
    >
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
