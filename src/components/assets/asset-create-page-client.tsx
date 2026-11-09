"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
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
import { Panel, PanelBody, PanelFooter } from "@/components/ui/panel";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppSettings } from "@/lib/api/app-settings";
import { createAsset, getAssetFilterOptions } from "@/lib/api/assets";
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
  // "Add asset here…" on the Locations page presets the location.
  const presetLocationId = useSearchParams().get("location");
  const initialValues = useMemo(
    () => ({ ...INITIAL_VALUES, locationId: presetLocationId }),
    [presetLocationId],
  );

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
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["service-schedules"] });

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
      <div className="max-w-[880px]">
        <span className="sr-only">Loading form...</span>
        <Skeleton className="mb-5 h-4 w-28 rounded-md" />
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-9 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (createdAssetId) {
    return (
      <div className="max-w-[880px] space-y-10">
        <Panel>
          <PanelBody className="py-4">
            <p className="flex items-center gap-2 text-sm font-medium text-ink-2">
              <Check className="size-4 text-foreground" aria-hidden="true" />
              Asset created
            </p>
            <h2 className="wide mt-1 text-xl leading-tight font-bold text-foreground">
              {createdAssetName}
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Upload attachments now, then continue to the asset page.
            </p>
          </PanelBody>
          <PanelFooter className="flex-wrap">
            <Button
              type="button"
              onClick={() => router.push(`/assets/${createdAssetId}`)}
            >
              Open asset
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/assets/${createdAssetId}/edit`)}
            >
              Edit details…
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreatedAssetId(null);
                setCreatedAssetName("");
                setServiceScheduleDraft(getDefaultServiceScheduleDraft());
              }}
            >
              Add another asset…
            </Button>
          </PanelFooter>
        </Panel>

        <section aria-labelledby="asset-create-attachments">
          <SheetHeading
            title={<span id="asset-create-attachments">Attachments</span>}
          />
          <p className="px-0.5 pt-1.5 pb-3 text-[13px] text-muted-foreground">
            Files upload straight away. Images and PDFs are optimized in the
            background.
          </p>
          <AttachmentsPanel assetId={createdAssetId} />
        </section>
      </div>
    );
  }

  return (
    <AssetForm
      mode="create"
      categories={options.categories}
      locations={options.locations}
      serviceGroups={options.serviceGroups}
      tags={options.tags}
      fieldDefinitions={customFieldDefinitions}
      initialValues={initialValues}
      submitLabel="Create asset"
      cancelHref={
        presetLocationId ? `/locations?location=${presetLocationId}` : "/assets"
      }
      submitting={submitting}
      serviceSchedulingEnabled={serviceSchedulingEnabled}
      serviceScheduleDraft={serviceScheduleDraft}
      onServiceScheduleChange={setServiceScheduleDraft}
      onClearServiceSchedule={() =>
        setServiceScheduleDraft(getDefaultServiceScheduleDraft())
      }
      onSubmit={handleSubmit}
    />
  );
}
