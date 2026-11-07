"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import {
  getDefaultServiceScheduleDraft,
  parseServiceScheduleDraft,
} from "@/components/assets/service-schedule-fields";
import { AssetForm } from "@/components/assets/asset-form";
import { getAssetUiErrorMessage } from "@/components/assets/error-messages";
import type {
  AssetDetail,
  AssetFilterOptions,
  AssetFormValues,
  ServiceScheduleDraft,
} from "@/components/assets/types";
import type { FieldDefinition } from "@/components/fields/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppSettings } from "@/lib/api/app-settings";
import { getAsset, getAssetFilterOptions, updateAsset } from "@/lib/api/assets";
import { listCustomFields } from "@/lib/api/custom-fields";
import {
  deleteSchedule,
  getScheduleByAssetId,
  upsertSchedule,
} from "@/lib/api/service-schedules";

function toFormValues(asset: AssetDetail): AssetFormValues {
  return {
    name: asset.name,
    categoryId: asset.categoryId,
    locationId: asset.locationId,
    serviceGroupId: asset.serviceGroupId,
    status: asset.status,
    notes: asset.notes ?? "",
    customFieldValues: asset.customFieldValues,
    tagIds: asset.tags.map((tag) => tag.id),
  };
}

export function AssetEditPageClient({ assetId }: { assetId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const assetQuery = useQuery({
    queryKey: ["assets", "detail", assetId],
    queryFn: () => getAsset(assetId),
  });
  const filterOptionsQuery = useQuery({
    queryKey: ["assets", "filter-options"],
    queryFn: getAssetFilterOptions,
  });
  const fieldsQuery = useQuery({
    queryKey: ["custom-fields", "list"],
    queryFn: listCustomFields,
  });
  const scheduleQuery = useQuery({
    queryKey: ["service-schedules", "by-asset", assetId],
    queryFn: () => getScheduleByAssetId(assetId),
  });
  const appSettingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  const [submitting, setSubmitting] = useState(false);
  const [serviceScheduleDraft, setServiceScheduleDraft] =
    useState<ServiceScheduleDraft>(getDefaultServiceScheduleDraft);
  const [scheduleSeeded, setScheduleSeeded] = useState(false);

  const loading =
    assetQuery.isPending ||
    filterOptionsQuery.isPending ||
    fieldsQuery.isPending ||
    scheduleQuery.isPending ||
    appSettingsQuery.isPending;

  const options: AssetFilterOptions = filterOptionsQuery.data ?? {
    categories: [],
    locations: [],
    tags: [],
    serviceGroups: [],
  };

  const customFieldDefinitions = useMemo(
    () => (fieldsQuery.data ?? []) as unknown as FieldDefinition[],
    [fieldsQuery.data],
  );

  const detail = (assetQuery.data ?? null) as AssetDetail | null;
  const initialValues = useMemo(
    () => (detail ? toFormValues(detail) : null),
    [detail],
  );
  const serviceSchedulingEnabled =
    appSettingsQuery.data?.serviceSchedulingEnabled ?? true;
  const existingSchedule = scheduleQuery.data ?? null;

  useEffect(() => {
    if (scheduleQuery.isPending || scheduleSeeded) {
      return;
    }

    if (!existingSchedule) {
      setServiceScheduleDraft(getDefaultServiceScheduleDraft());
      setScheduleSeeded(true);
      return;
    }

    setServiceScheduleDraft({
      nextServiceDate: existingSchedule.nextServiceDate,
      intervalValue: String(existingSchedule.intervalValue),
      intervalUnit: existingSchedule.intervalUnit,
      reminderLeadValue: String(existingSchedule.reminderLeadValue),
      reminderLeadUnit: existingSchedule.reminderLeadUnit,
    });
    setScheduleSeeded(true);
  }, [existingSchedule, scheduleQuery.isPending, scheduleSeeded]);

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAsset>[1]) =>
      updateAsset(assetId, input),
  });

  async function handleSubmit(values: AssetFormValues) {
    const parsedSchedule = serviceSchedulingEnabled
      ? parseServiceScheduleDraft(serviceScheduleDraft)
      : { value: null, error: null };

    if (serviceSchedulingEnabled && parsedSchedule.error) {
      toast.error(parsedSchedule.error);
      return;
    }

    setSubmitting(true);
    try {
      const promises: Promise<unknown>[] = [
        updateMutation.mutateAsync({
          name: values.name,
          categoryId: values.categoryId,
          locationId: values.locationId,
          serviceGroupId: values.serviceGroupId,
          status: values.status,
          notes: values.notes.trim() ? values.notes : null,
          customFieldValues: values.customFieldValues,
          tagIds: values.tagIds,
        }),
      ];

      if (serviceSchedulingEnabled) {
        if (parsedSchedule.value) {
          promises.push(
            upsertSchedule({
              assetId,
              nextServiceDate: parsedSchedule.value.nextServiceDate,
              intervalValue: parsedSchedule.value.intervalValue,
              intervalUnit: parsedSchedule.value.intervalUnit,
              reminderLeadValue: parsedSchedule.value.reminderLeadValue,
              reminderLeadUnit: parsedSchedule.value.reminderLeadUnit,
            }),
          );
        } else if (existingSchedule) {
          promises.push(deleteSchedule(assetId));
        }
      }

      await Promise.all(promises);

      void queryClient.invalidateQueries({
        queryKey: ["assets", "detail", assetId],
      });
      void queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
      void queryClient.invalidateQueries({
        queryKey: ["service-schedules", "by-asset", assetId],
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["service-schedules"] });

      toast.success("Asset updated");
      router.push(`/assets/${assetId}`);
    } catch (error) {
      toast.error(getAssetUiErrorMessage(error, "Unable to update asset"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[880px]">
        <span className="sr-only">Loading asset...</span>
        <Skeleton className="mb-5 h-4 w-28 rounded-md" />
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-9 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail || !initialValues) {
    return (
      <EmptyState
        icon={PackageX}
        title="Asset not found."
        description="The asset may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/assets">Back to assets</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      <AssetForm
        mode="edit"
        categories={options.categories}
        locations={options.locations}
        serviceGroups={options.serviceGroups}
        tags={options.tags}
        fieldDefinitions={customFieldDefinitions}
        initialValues={initialValues}
        assetTag={detail.assetTag}
        submitLabel="Save changes"
        cancelHref={`/assets/${assetId}`}
        submitting={submitting}
        serviceSchedulingEnabled={serviceSchedulingEnabled}
        serviceScheduleDraft={serviceScheduleDraft}
        onServiceScheduleChange={setServiceScheduleDraft}
        onClearServiceSchedule={() =>
          setServiceScheduleDraft(getDefaultServiceScheduleDraft())
        }
        onSubmit={handleSubmit}
      />

      <section
        aria-labelledby="asset-edit-attachments"
        className="max-w-[880px]"
      >
        <SheetHeading
          title={<span id="asset-edit-attachments">Attachments</span>}
        />
        <p className="px-0.5 pt-1.5 pb-3 text-[13px] text-muted-foreground">
          Files upload straight away. Images and PDFs are optimized in the
          background.
        </p>
        <AttachmentsPanel assetId={assetId} />
      </section>
    </div>
  );
}
