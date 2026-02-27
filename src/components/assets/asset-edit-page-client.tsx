"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { AttachmentsPanel } from "@/components/attachments/attachments-panel"
import { AssetForm } from "@/components/assets/asset-form"
import { getAssetUiErrorMessage } from "@/components/assets/error-messages"
import type { AssetDetail, AssetFilterOptions, AssetFormValues } from "@/components/assets/types"
import type { FieldDefinition } from "@/components/fields/types"
import { Button } from "@/components/ui/button"
import type { Id } from "@/lib/convex-api"
import { api } from "@/lib/convex-api"

function toFormValues(asset: AssetDetail): AssetFormValues {
  return {
    name: asset.name,
    categoryId: asset.categoryId,
    locationId: asset.locationId,
    status: asset.status,
    notes: asset.notes ?? "",
    customFieldValues: asset.customFieldValues,
    tagIds: asset.tags.map((tag) => tag._id),
  }
}

export function AssetEditPageClient({
  assetId,
}: {
  assetId: Id<"assets">
}) {
  const router = useRouter()
  const updateAsset = useMutation(api.assets.updateAsset)

  const asset = useQuery(api.assets.getAsset, { assetId })
  const filterOptions = useQuery(api.assets.getAssetFilterOptions, {})
  const fieldDefinitions = useQuery(api.customFields.listFieldDefinitions, {})

  const [submitting, setSubmitting] = useState(false)

  const loading = asset === undefined || filterOptions === undefined || fieldDefinitions === undefined

  const options = (filterOptions ?? {
    categories: [],
    locations: [],
    tags: [],
  }) as AssetFilterOptions

  const customFieldDefinitions = useMemo(
    () => ((fieldDefinitions ?? []) as unknown as FieldDefinition[]),
    [fieldDefinitions],
  )

  const detail = (asset ?? null) as AssetDetail | null
  const initialValues = useMemo(
    () => (detail ? toFormValues(detail) : null),
    [detail],
  )

  async function handleSubmit(values: AssetFormValues) {
    setSubmitting(true)
    try {
      await updateAsset({
        assetId,
        name: values.name,
        categoryId: values.categoryId,
        locationId: values.locationId,
        status: values.status,
        notes: values.notes.trim() ? values.notes : null,
        customFieldValues: values.customFieldValues,
        tagIds: values.tagIds,
      })

      toast.success("Asset updated")
      router.push(`/assets/${assetId}`)
    } catch (error) {
      toast.error(getAssetUiErrorMessage(error, "Unable to update asset"))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading asset...
      </div>
    )
  }

  if (!detail || !initialValues) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Asset not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The asset may have been deleted.
        </p>
        <Button asChild className="mt-4 cursor-pointer" variant="outline">
          <Link href="/assets">Back to assets</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <AssetForm
          mode="edit"
          categories={options.categories}
          locations={options.locations}
          tags={options.tags}
          fieldDefinitions={customFieldDefinitions}
          initialValues={initialValues}
          assetTag={detail.assetTag}
          submitLabel="Save changes"
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </section>

      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold tracking-tight">Attachments</h3>
          <p className="text-xs text-muted-foreground">
            Upload files immediately. Images and PDFs are optimized in the background.
          </p>
        </div>
        <AttachmentsPanel assetId={assetId} />
      </section>
    </div>
  )
}
