"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import {
  getDefaultServiceScheduleDraft,
  parseServiceScheduleDraft,
} from "@/components/assets/service-schedule-fields";
import { AssetForm } from "@/components/assets/asset-form";
import { getAssetUiErrorMessage } from "@/components/assets/error-messages";
import type {
  AssetFilterOptions,
  AssetFormValues,
  ServiceScheduleDraft,
} from "@/components/assets/types";
import type { FieldDefinition } from "@/components/fields/types";
import { Button } from "@/components/ui/button";
import { getAppSettings } from "@/lib/api/app-settings";
import {
  createAsset,
  getAssetFilterOptions,
} from "@/lib/api/assets";
import { listCustomFields } from "@/lib/api/custom-fields";
import { upsertSchedule } from "@/lib/api/service-schedules";

const INITIAL_VALUES: AssetFormValues = {
  name: "",
  categoryId: null,
  locationId: null,
  serviceGroupId: null,
  status: "active",
  notes: "",
  customFieldValues: {},
  tagIds: [],
};

export function AssetCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const filterOptionsQuery = useQuery({
    queryKey: ["assets", "filter-options"],
    queryFn: getAssetFilterOptions,
  });
  const fieldsQuery = useQuery({
    queryKey: ["custom-fields", "list"],
    queryFn: listCustomFields,
  });
  const appSettingsQuery = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  const [submitting, setSubmitting] = useState(false);
  const [serviceScheduleDraft, setServiceScheduleDraft] =
    useState<ServiceScheduleDraft>(getDefaultServiceScheduleDraft);
  const [createdAssetId, setCreatedAssetId] = useState<string | null>(null);
  const [createdAssetName, setCreatedAssetName] = useState("");

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

  const loading =
    filterOptionsQuery.isPending ||
    fieldsQuery.isPending ||
    appSettingsQuery.isPending;
  const serviceSchedulingEnabled =
    appSettingsQuery.data?.serviceSchedulingEnabled ?? true;

  async function handleSubmit(values: AssetFormValues) {
    if (serviceSchedulingEnabled) {
      const parsedSchedule = parseServiceScheduleDraft(serviceScheduleDraft);
      if (parsedSchedule.error) {
        toast.error(parsedSchedule.error);
        return;
      }
    }

    setSubmitting(true);
    try {
      const parsedSchedule = serviceSchedulingEnabled
        ? parseServiceScheduleDraft(serviceScheduleDraft)
        : { value: null };

      const result = await createAsset({
        name: values.name,
        categoryId: values.categoryId,
        locationId: values.locationId,
        serviceGroupId: values.serviceGroupId,
        status: values.status,
        notes: values.notes.trim() ? values.notes : null,
        customFieldValues: values.customFieldValues,
        tagIds: values.tagIds,
      });

      if (serviceSchedulingEnabled && parsedSchedule.value) {
        await upsertSchedule({
          assetId: result.assetId,
          nextServiceDate: parsedSchedule.value.nextServiceDate,
          intervalValue: parsedSchedule.value.intervalValue,
          intervalUnit: parsedSchedule.value.intervalUnit,
          reminderLeadValue: parsedSchedule.value.reminderLeadValue,
          reminderLeadUnit: parsedSchedule.value.reminderLeadUnit,
        });
      }

      void queryClient.invalidateQueries({ queryKey: ["assets", "list"] });

      setCreatedAssetId(result.assetId);
      setCreatedAssetName(values.name);
      toast.success("Asset created. Add attachments or continue.");
    } catch (error) {
      toast.error(getAssetUiErrorMessage(error, "Unable to create asset"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading form...
      </div>
    );
  }

  if (createdAssetId) {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">
            {createdAssetName} created
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload attachments now, then continue to the asset page.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => router.push(`/assets/${createdAssetId}`)}
            >
              View asset
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => router.push(`/assets/${createdAssetId}/edit`)}
            >
              Edit details
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => {
                setCreatedAssetId(null);
                setCreatedAssetName("");
                setServiceScheduleDraft(getDefaultServiceScheduleDraft());
              }}
            >
              Create another asset
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold tracking-tight">
              Attachments
            </h3>
            <p className="text-xs text-muted-foreground">
              Upload files now. Images and PDFs are optimized in the background.
            </p>
          </div>
          <AttachmentsPanel assetId={createdAssetId} />
        </section>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <AssetForm
        mode="create"
        categories={options.categories}
        locations={options.locations}
        serviceGroups={options.serviceGroups}
        tags={options.tags}
        fieldDefinitions={customFieldDefinitions}
        initialValues={INITIAL_VALUES}
        submitLabel="Create asset"
        submitting={submitting}
        serviceSchedulingEnabled={serviceSchedulingEnabled}
        serviceScheduleDraft={serviceScheduleDraft}
        onServiceScheduleChange={setServiceScheduleDraft}
        onClearServiceSchedule={() =>
          setServiceScheduleDraft(getDefaultServiceScheduleDraft())
        }
        onSubmit={handleSubmit}
      />
    </section>
  );
}
