"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { AssetForm } from "@/components/assets/asset-form"
import { getAssetUiErrorMessage } from "@/components/assets/error-messages"
import type { AssetFilterOptions, AssetFormValues } from "@/components/assets/types"
import type { FieldDefinition } from "@/components/fields/types"
import { api } from "@/lib/convex-api"

const INITIAL_VALUES: AssetFormValues = {
  name: "",
  categoryId: null,
  locationId: null,
  status: "active",
  notes: "",
  customFieldValues: {},
  tagIds: [],
}

export function AssetCreatePageClient() {
  const router = useRouter()
  const createAsset = useMutation(api.assets.createAsset)

  const filterOptions = useQuery(api.assets.getAssetFilterOptions, {})
  const fieldDefinitions = useQuery(api.customFields.listFieldDefinitions, {})

  const [submitting, setSubmitting] = useState(false)

  const options = (filterOptions ?? {
    categories: [],
    locations: [],
    tags: [],
  }) as AssetFilterOptions

  const customFieldDefinitions = useMemo(
    () => ((fieldDefinitions ?? []) as unknown as FieldDefinition[]),
    [fieldDefinitions],
  )

  const loading = filterOptions === undefined || fieldDefinitions === undefined

  async function handleSubmit(values: AssetFormValues) {
    setSubmitting(true)
    try {
      const result = await createAsset({
        name: values.name,
        categoryId: values.categoryId,
        locationId: values.locationId,
        status: values.status,
        notes: values.notes.trim() ? values.notes : null,
        customFieldValues: values.customFieldValues,
        tagIds: values.tagIds,
      })

      toast.success("Asset created")
      router.push(`/assets/${result.assetId}`)
    } catch (error) {
      toast.error(getAssetUiErrorMessage(error, "Unable to create asset"))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Loading form...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <AssetForm
          mode="create"
          categories={options.categories}
          locations={options.locations}
          tags={options.tags}
          fieldDefinitions={customFieldDefinitions}
          initialValues={INITIAL_VALUES}
          submitLabel="Create asset"
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </section>

      <section className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        Attachments can be uploaded immediately after the asset is created.
      </section>
    </div>
  )
}
