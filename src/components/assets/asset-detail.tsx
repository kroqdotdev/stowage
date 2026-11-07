"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  MapPin,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";
import type { FieldDefinition } from "@/components/fields/types";
import { DynamicFieldDisplay } from "@/components/fields/dynamic-field-display";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { AssetServiceRecordsPanel } from "@/components/services/asset-service-records-panel";
import { NextServicePanel } from "@/components/services/next-service-panel";
import { AssetLabelPanel } from "@/components/labels/asset-label-panel";
import { AssetPhotoSlot } from "@/components/assets/asset-photo-slot";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetDetail as AssetDetailType,
  type AssetStatus,
} from "@/components/assets/types";
import { MobileBar } from "@/components/layout/mobile-top-bar";
import {
  LocationPicker,
  type LocationPickerOption,
} from "@/components/locations/location-picker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { STATUS_COLOR } from "@/components/ui/status-text";
import { KeywordChip, TagChip } from "@/components/ui/tag-chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAttachments } from "@/lib/api/attachments";
import { listLocations } from "@/lib/api/locations";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { formatRelativeTime } from "@/lib/relative-time";
import { useAppDateFormat } from "@/lib/use-app-date-format";
import { cn } from "@/lib/utils";

const pickerRun =
  "inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-xs text-[15px] font-medium outline-none hover:text-foreground disabled:cursor-default disabled:opacity-60";

function AssetMenu({
  asset,
  canDelete,
  deleting,
  onDelete,
  trigger,
}: {
  asset: AssetDetailType;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  trigger: React.ReactElement;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/assets/${asset.id}/edit`}>
            <Pencil />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/labels/print?assetId=${asset.id}`}>
            <Printer />
            Print label
          </Link>
        </DropdownMenuItem>
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              data-testid="asset-detail-delete"
              disabled={deleting}
              onSelect={onDelete}
            >
              <Trash2 />
              Delete…
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/*
  The asset page. A hero (photo slot, the tag chip at its heaviest, the name,
  then status and location as picker runs and the keywords), the 2px rule,
  then two columns: the tabbed details card and the service history sheet on
  the left; Next service and the label on the right. On a phone the order is
  Next service, details, history, label.
*/
export function AssetDetail({
  asset,
  fieldDefinitions,
  canDelete,
  deleting,
  updatingStatus,
  updatingLocation = false,
  onStatusChange,
  onLocationChange,
  onDelete,
}: {
  asset: AssetDetailType;
  fieldDefinitions: FieldDefinition[];
  canDelete: boolean;
  deleting: boolean;
  updatingStatus: boolean;
  updatingLocation?: boolean;
  onStatusChange: (status: AssetStatus) => void;
  onLocationChange?: (locationId: string | null) => void;
  onDelete: () => Promise<void>;
}) {
  const dateFormat = useAppDateFormat();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const locationsQuery = useQuery({
    queryKey: ["locations", "list"],
    queryFn: listLocations,
    enabled: Boolean(onLocationChange),
  });
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", asset.id],
    queryFn: () => listAttachments(asset.id),
  });
  const attachmentCount = attachmentsQuery.data?.length ?? 0;

  const orderedFieldDefinitions = useMemo(
    () => fieldDefinitions.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldDefinitions],
  );

  const locationParts = asset.location?.path.split(" / ") ?? [];
  const locationLeaf = locationParts.pop();
  const locationAncestors = locationParts.join(" / ");

  const labelAsset = useMemo(
    () => ({
      id: asset.id,
      name: asset.name,
      assetTag: asset.assetTag,
      categoryName: asset.category?.name ?? null,
      locationPath: asset.location?.path ?? null,
      notes: asset.notes,
      customFieldValues: asset.customFieldValues,
    }),
    [asset],
  );

  const updated = formatRelativeTime(asset.updatedAt);

  const locationTrigger = (
    <button
      type="button"
      disabled={updatingLocation}
      aria-label={`Location: ${asset.location?.path ?? "none"}. Change location`}
      className={cn(pickerRun, "min-w-0 text-ink-2")}
    >
      <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="picker-run truncate">
        {asset.location ? (
          <>
            {locationAncestors ? `${locationAncestors} / ` : null}
            <b className="font-semibold text-foreground">{locationLeaf}</b>
          </>
        ) : (
          "No location"
        )}
      </span>
      <ChevronDown className="size-3.5 shrink-0 text-ink-2" aria-hidden="true" />
    </button>
  );

  const locationRun = onLocationChange ? (
    <LocationPicker
      value={asset.locationId}
      options={(locationsQuery.data ?? []) as LocationPickerOption[]}
      onChange={onLocationChange}
      disabled={updatingLocation}
      trigger={locationTrigger}
      compact
    />
  ) : asset.location ? (
    <span className="inline-flex items-center gap-1.5 text-[15px] text-ink-2">
      <MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" />
      {asset.location.path}
    </span>
  ) : null;

  return (
    <div>
      <MobileBar
        backHref="/assets"
        backLabel="Back to Assets"
        center={
          <TagChip className="border-white bg-transparent text-white">{asset.assetTag}</TagChip>
        }
        actions={
          <>
            <Link
              href={`/assets/${asset.id}/edit`}
              aria-label="Edit asset"
              className="grid size-11 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Pencil className="size-5" />
            </Link>
            <AssetMenu
              asset={asset}
              canDelete={canDelete}
              deleting={deleting}
              onDelete={() => setConfirmDeleteOpen(true)}
              trigger={
                <button
                  type="button"
                  aria-label="Asset actions"
                  data-testid="asset-detail-kebab"
                  className="grid size-11 cursor-pointer place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <MoreHorizontal className="size-5" />
                </button>
              }
            />
          </>
        }
      />

      <Link
        href="/assets"
        className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-foreground max-md:hidden"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Assets
      </Link>

      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_88px] items-start gap-x-3 gap-y-3 rule-ink pb-5 md:mb-7 md:grid-cols-[112px_minmax(0,1fr)_auto] md:gap-x-6 md:pb-6 lg:grid-cols-[144px_minmax(0,1fr)_auto]">
        <AssetPhotoSlot
          assetId={asset.id}
          assetName={asset.name}
          className="col-start-2 row-start-1 mt-1 size-[88px] md:col-start-1 md:mt-0 md:h-full md:min-h-28 md:w-full"
        />

        <div className="col-start-1 row-start-1 min-w-0 md:col-start-2">
          <TagChip weight="hero" data-testid="asset-tag" className="max-md:hidden">
            {asset.assetTag}
          </TagChip>
          <h1 className="wide mt-0 text-2xl leading-[1.08] font-bold text-balance text-foreground md:mt-3 md:text-[30px] lg:text-[34px]">
            {asset.name}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Select
              value={asset.status}
              onValueChange={(value) => onStatusChange(value as AssetStatus)}
              disabled={updatingStatus}
            >
              <SelectTrigger
                aria-label="Change status"
                className={cn(
                  pickerRun,
                  "h-8 w-auto min-w-0 gap-1.5 border-0 bg-transparent px-0 py-0 shadow-none hover:bg-transparent data-[size=default]:h-8 [&>svg]:opacity-100",
                  STATUS_COLOR[asset.status],
                  asset.status === "active" && "text-foreground",
                )}
              >
                <span className="picker-run">{ASSET_STATUS_LABELS[asset.status]}</span>
              </SelectTrigger>
              <SelectContent>
                {ASSET_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ASSET_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {locationRun}
            {asset.category ? (
              <span className="text-[15px] text-ink-2 max-lg:hidden">
                <span aria-hidden="true" className="mr-3 text-muted-foreground">·</span>
                {asset.category.name}
              </span>
            ) : null}
          </div>

          {asset.tags.length > 0 || asset.category ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {asset.category ? (
                <span className="mr-1.5 text-sm text-ink-2 lg:hidden">{asset.category.name}</span>
              ) : null}
              {asset.tags.map((tag) => (
                <KeywordChip key={tag.id}>{tag.name}</KeywordChip>
              ))}
            </div>
          ) : null}
        </div>

        <div className="col-start-3 row-start-1 flex items-center gap-2 max-md:hidden">
          <Button asChild variant="outline">
            <Link href={`/assets/${asset.id}/edit`}>
              <Pencil />
              Edit
            </Link>
          </Button>
          <AssetMenu
            asset={asset}
            canDelete={canDelete}
            deleting={deleting}
            onDelete={() => setConfirmDeleteOpen(true)}
            trigger={
              <Button type="button" variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
      </header>

      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_300px] md:items-start md:gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-7">
        <div className="max-md:contents md:space-y-8">
          <Panel className="order-2 overflow-hidden">
            <Tabs defaultValue="info" className="gap-0">
              <TabsList variant="line" data-testid="asset-detail-tabs">
                <TabsTrigger value="info">Details</TabsTrigger>
                <TabsTrigger value="attachments">
                  Attachments
                  {attachmentCount > 0 ? (
                    <small className="font-mono text-[13px] font-medium text-muted-foreground">
                      {attachmentCount}
                    </small>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                {orderedFieldDefinitions.length > 0 || asset.serviceGroup ? (
                  <div className="overflow-hidden border-b border-border">
                    <dl className="-mr-px -mb-px grid grid-cols-2 lg:grid-cols-3">
                      {orderedFieldDefinitions.map((definition) => (
                        <div
                          key={definition.id}
                          className="min-w-0 border-r border-b border-border px-[18px] py-3.5"
                        >
                          <dt className="text-[13px] text-ink-2">{definition.name}</dt>
                          <dd className="mt-1 text-[15px] font-semibold break-words text-foreground">
                            <DynamicFieldDisplay
                              definition={definition}
                              value={asset.customFieldValues[definition.id as string] ?? null}
                              dateFormat={dateFormat}
                            />
                          </dd>
                        </div>
                      ))}
                      {asset.serviceGroup ? (
                        <div className="min-w-0 border-r border-b border-border px-[18px] py-3.5">
                          <dt className="text-[13px] text-ink-2">Service plan</dt>
                          <dd className="mt-1 text-[15px] font-semibold text-foreground">
                            {asset.serviceGroup.name}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ) : null}

                <div className="px-[18px] pt-3.5 pb-4">
                  <h3 className="text-[13px] font-medium text-ink-2">Notes</h3>
                  <p
                    className={cn(
                      "mt-1 max-w-[68ch] text-[15px] leading-relaxed whitespace-pre-wrap",
                      asset.notes ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {asset.notes ?? "No notes"}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="attachments" className="p-[18px]">
                <AttachmentsPanel assetId={asset.id} />
              </TabsContent>
            </Tabs>
          </Panel>

          <div className="order-3">
            <AssetServiceRecordsPanel assetId={asset.id} />
          </div>

          <p className="order-5 border-t border-border pt-3.5 text-sm text-muted-foreground">
            Created {formatDateFromTimestamp(asset.createdAt, dateFormat)}.{" "}
            <span className="whitespace-nowrap">
              Last changed <span className="max-md:hidden">{updated.long}</span>
              <span className="md:hidden">{updated.short}</span>.
            </span>
          </p>
        </div>

        <aside className="max-md:contents md:space-y-5">
          <NextServicePanel
            className="order-1"
            assetId={asset.id}
            assetName={asset.name}
            serviceGroupName={asset.serviceGroup?.name ?? null}
          />
          <AssetLabelPanel
            className="order-4"
            asset={labelAsset}
            fieldDefinitions={fieldDefinitions}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete asset?"
        description={`${asset.assetTag} ${asset.name} and its service history are deleted.`}
        confirmLabel="Delete asset"
        busy={deleting}
        onConfirm={() => {
          void onDelete();
        }}
        onClose={() => {
          if (!deleting) {
            setConfirmDeleteOpen(false);
          }
        }}
      />
    </div>
  );
}
