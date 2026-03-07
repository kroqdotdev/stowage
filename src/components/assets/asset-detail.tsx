"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Pencil, Printer, Trash2 } from "lucide-react";
import type { FieldDefinition } from "@/components/fields/types";
import { DynamicFieldDisplay } from "@/components/fields/dynamic-field-display";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { AttachmentsPanel } from "@/components/attachments/attachments-panel";
import { AssetServiceRecordsPanel } from "@/components/services/asset-service-records-panel";
import { StatusBadge } from "@/components/assets/status-badge";
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetDetail as AssetDetailType,
  type AssetStatus,
} from "@/components/assets/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";

export function AssetDetail({
  asset,
  fieldDefinitions,
  canDelete,
  deleting,
  updatingStatus,
  onStatusChange,
  onDelete,
}: {
  asset: AssetDetailType;
  fieldDefinitions: FieldDefinition[];
  canDelete: boolean;
  deleting: boolean;
  updatingStatus: boolean;
  onStatusChange: (status: AssetStatus) => void;
  onDelete: () => Promise<void>;
}) {
  const dateFormat = useAppDateFormat();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const orderedFieldDefinitions = useMemo(
    () => fieldDefinitions.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldDefinitions],
  );

  return (
    <div className="space-y-4">
      {/* Hero profile card */}
      <section className="rounded-xl border border-border/70 bg-gradient-to-r from-orange-50/60 to-background shadow-sm dark:from-stone-900/40 dark:to-card">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {asset.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge className="border border-border/70 bg-background/80 font-mono text-xs tracking-wide">
                {asset.assetTag}
              </Badge>
              <StatusBadge status={asset.status} />
              {asset.category ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: asset.category.color }}
                  />
                  {asset.category.name}
                </span>
              ) : null}
              {asset.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {asset.location.path}
                </span>
              ) : null}
            </div>
            {asset.serviceGroup ? (
              <p className="text-xs text-muted-foreground">
                Service group: {asset.serviceGroup.name}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Created {formatDateFromTimestamp(asset.createdAt, dateFormat)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={asset.status}
              onValueChange={(value) =>
                onStatusChange(value as AssetStatus)
              }
              disabled={updatingStatus}
            >
              <SelectTrigger className="min-w-44" aria-label="Change status">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" className="cursor-pointer">
                  <Link href={`/assets/${asset._id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit asset details</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  disabled
                  aria-disabled="true"
                >
                  <Printer className="h-4 w-4" />
                  Print label
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Print asset label (coming soon)
              </TooltipContent>
            </Tooltip>

            {canDelete ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Permanently delete this asset</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      </section>

      {/* Tabbed content */}
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <Tabs defaultValue="info">
          <TabsList className="mb-4">
            <TabsTrigger value="info">Details</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="space-y-6">
              {/* Tags */}
              {asset.tags.length > 0 ? (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => (
                      <Badge
                        key={tag._id}
                        className="border border-border/70 bg-muted/20 text-xs"
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Notes */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {asset.notes ?? "No notes"}
                </p>
              </div>

              {/* Custom fields */}
              {orderedFieldDefinitions.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="border-b border-primary/20 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Custom fields
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {orderedFieldDefinitions.map((definition) => (
                      <div
                        key={definition._id}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {definition.name}
                        </p>
                        <p className="mt-1 text-sm">
                          <DynamicFieldDisplay
                            definition={definition}
                            value={
                              asset.customFieldValues[
                                definition._id as string
                              ] ?? null
                            }
                            dateFormat={dateFormat}
                          />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="service">
            <AssetServiceRecordsPanel assetId={asset._id} />
          </TabsContent>

          <TabsContent value="attachments">
            <AttachmentsPanel assetId={asset._id} />
          </TabsContent>
        </Tabs>
      </section>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete asset"
        description={`Delete ${asset.name}?`}
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
