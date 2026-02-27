"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Pencil, Printer, Trash2, Wrench } from "lucide-react"
import type { FieldDefinition } from "@/components/fields/types"
import { DynamicFieldDisplay } from "@/components/fields/dynamic-field-display"
import { ConfirmDialog } from "@/components/crud/confirm-dialog"
import { AttachmentsPanel } from "@/components/attachments/attachments-panel"
import { StatusBadge } from "@/components/assets/status-badge"
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetDetail as AssetDetailType,
  type AssetStatus,
} from "@/components/assets/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateFromTimestamp } from "@/lib/date-format"
import { useAppDateFormat } from "@/lib/use-app-date-format"

type AssetTab = "info" | "service" | "attachments"

function AssetTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`rounded-md px-3 py-1.5 text-sm transition ${
        active
          ? "bg-muted/70 text-foreground"
          : "text-muted-foreground hover:bg-muted/35 hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function AssetDetail({
  asset,
  fieldDefinitions,
  canDelete,
  deleting,
  updatingStatus,
  onStatusChange,
  onDelete,
}: {
  asset: AssetDetailType
  fieldDefinitions: FieldDefinition[]
  canDelete: boolean
  deleting: boolean
  updatingStatus: boolean
  onStatusChange: (status: AssetStatus) => void
  onDelete: () => Promise<void>
}) {
  const dateFormat = useAppDateFormat()
  const [activeTab, setActiveTab] = useState<AssetTab>("info")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const orderedFieldDefinitions = useMemo(
    () =>
      fieldDefinitions
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldDefinitions],
  )

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-border/70 bg-muted/20 font-mono text-xs tracking-wide">
                {asset.assetTag}
              </Badge>
              <StatusBadge status={asset.status} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{asset.name}</h2>
              <p className="text-sm text-muted-foreground">
                Created {formatDateFromTimestamp(asset.createdAt, dateFormat)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="asset-status-quick-change">
              Change status
            </label>
            <select
              id="asset-status-quick-change"
              className="h-9 min-w-44 rounded-md border border-input bg-background px-3 text-sm"
              value={asset.status}
              onChange={(event) => onStatusChange(event.target.value as AssetStatus)}
              disabled={updatingStatus}
            >
              {ASSET_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {ASSET_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <Button asChild variant="outline" className="cursor-pointer">
              <Link href={`/assets/${asset._id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>

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

            {canDelete ? (
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
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/15 p-1">
          <AssetTabButton active={activeTab === "info"} label="Info" onClick={() => setActiveTab("info")} />
          <AssetTabButton
            active={activeTab === "service"}
            label="Service"
            onClick={() => setActiveTab("service")}
          />
          <AssetTabButton
            active={activeTab === "attachments"}
            label="Attachments"
            onClick={() => setActiveTab("attachments")}
          />
        </div>

        {activeTab === "info" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Category</p>
                <p className="text-sm font-medium">{asset.category?.name ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{asset.location?.path ?? "—"}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
                {asset.tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <Badge key={tag._id} className="border border-border/70 bg-muted/20 text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {asset.notes ?? "No notes"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight">Custom fields</h3>
              {orderedFieldDefinitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom fields defined.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {orderedFieldDefinitions.map((definition) => (
                    <div key={definition._id} className="rounded-lg border border-border/60 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{definition.name}</p>
                      <p className="mt-1 text-sm">
                        <DynamicFieldDisplay
                          definition={definition}
                          value={asset.customFieldValues[definition._id as string] ?? null}
                          dateFormat={dateFormat}
                        />
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === "service" ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium">
              <Wrench className="h-3.5 w-3.5" />
              Service history
            </div>
            Service lifecycle tools will be added in the service phases.
          </div>
        ) : null}

        {activeTab === "attachments" ? (
          <AttachmentsPanel assetId={asset._id} />
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete asset"
        description={`Delete ${asset.name}?`}
        confirmLabel="Delete asset"
        busy={deleting}
        onConfirm={() => {
          void onDelete()
        }}
        onClose={() => {
          if (!deleting) {
            setConfirmDeleteOpen(false)
          }
        }}
      />
    </div>
  )
}
