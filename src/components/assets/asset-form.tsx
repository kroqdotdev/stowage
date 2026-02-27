"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useQuery } from "convex/react"
import type { Id } from "@/lib/convex-api"
import { DynamicField } from "@/components/fields/dynamic-field"
import type { FieldDefinition, FieldValue } from "@/components/fields/types"
import { LocationPicker, type LocationPickerOption } from "@/components/locations/location-picker"
import { TagPicker, type TagPickerOption } from "@/components/tags/tag-picker"
import {
  ASSET_STATUS_LABELS,
  ASSET_STATUS_OPTIONS,
  type AssetFormValues,
  type AssetStatus,
} from "@/components/assets/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/convex-api"

type CategoryOption = {
  _id: Id<"categories">
  name: string
  prefix: string | null
  color: string
}

function isEmptyValue(value: FieldValue) {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === "string") {
    return value.trim() === ""
  }

  return false
}

export function AssetForm({
  mode,
  categories,
  locations,
  tags,
  fieldDefinitions,
  initialValues,
  assetTag,
  submitting,
  submitLabel,
  onSubmit,
}: {
  mode: "create" | "edit"
  categories: CategoryOption[]
  locations: LocationPickerOption[]
  tags: TagPickerOption[]
  fieldDefinitions: FieldDefinition[]
  initialValues: AssetFormValues
  assetTag?: string | null
  submitting: boolean
  submitLabel: string
  onSubmit: (values: AssetFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<AssetFormValues>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const preview = useQuery(
    api.assets.generateAssetTag,
    mode === "create" ? { categoryId: values.categoryId } : "skip",
  )

  const activeAssetTag = mode === "create" ? preview?.assetTag ?? "Generating..." : assetTag ?? "—"
  const showTagLoading = mode === "create" && preview === undefined

  const fieldDefinitionsById = useMemo(
    () => new Map(fieldDefinitions.map((definition) => [definition._id as string, definition])),
    [fieldDefinitions],
  )

  function setFieldValue(field: keyof AssetFormValues, nextValue: AssetFormValues[typeof field]) {
    setValues((prev) => ({
      ...prev,
      [field]: nextValue,
    }))
    setErrors((prev) => {
      if (!prev[field]) {
        return prev
      }

      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function setCustomFieldValue(fieldId: string, value: FieldValue) {
    setValues((prev) => ({
      ...prev,
      customFieldValues: {
        ...prev.customFieldValues,
        [fieldId]: value as string | number | boolean | null,
      },
    }))

    setErrors((prev) => {
      if (!prev[`custom:${fieldId}`]) {
        return prev
      }

      const next = { ...prev }
      delete next[`custom:${fieldId}`]
      return next
    })
  }

  function validate() {
    const nextErrors: Record<string, string> = {}

    if (!values.name.trim()) {
      nextErrors.name = "Name is required"
    }

    for (const definition of fieldDefinitions) {
      if (!definition.required) {
        continue
      }

      const fieldId = definition._id as string
      const value = values.customFieldValues[fieldId]

      if (definition.fieldType === "checkbox") {
        if (value === null || value === undefined) {
          nextErrors[`custom:${fieldId}`] = `${definition.name} is required`
        }
        continue
      }

      if (isEmptyValue(value)) {
        nextErrors[`custom:${fieldId}`] = `${definition.name} is required`
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validate()) {
      return
    }

    await onSubmit({
      ...values,
      name: values.name.trim(),
      notes: values.notes,
      customFieldValues: Object.fromEntries(
        Object.entries(values.customFieldValues).filter(([fieldId, value]) => {
          const definition = fieldDefinitionsById.get(fieldId)
          if (!definition) {
            return false
          }

          if (definition.fieldType === "checkbox") {
            return value !== null && value !== undefined
          }

          return !isEmptyValue(value)
        }),
      ),
    })
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="asset-name" className="text-sm font-medium">
            Name
            <span className="ml-1 text-destructive">*</span>
          </label>
          <Input
            id="asset-name"
            value={values.name}
            onChange={(event) => setFieldValue("name", event.target.value)}
            placeholder="Asset name"
            disabled={submitting}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="asset-category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="asset-category"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.categoryId ?? ""}
            onChange={(event) =>
              setFieldValue(
                "categoryId",
                event.target.value ? (event.target.value as Id<"categories">) : null,
              )
            }
            disabled={submitting}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="asset-tag" className="text-sm font-medium">
            Asset tag
          </label>
          <div className="flex h-9 items-center rounded-md border border-border/70 bg-muted/20 px-3 text-sm font-mono tracking-wide">
            {showTagLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {activeAssetTag}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="asset-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="asset-status"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.status}
            onChange={(event) =>
              setFieldValue("status", event.target.value as AssetStatus)
            }
            disabled={submitting}
          >
            {ASSET_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="asset-location" className="text-sm font-medium">
            Location
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
          <label className="text-sm font-medium">Tags</label>
          <TagPicker
            value={values.tagIds}
            options={tags}
            onChange={(tagIds) => setFieldValue("tagIds", tagIds)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="asset-notes" className="text-sm font-medium">
          Notes
        </label>
        <Textarea
          id="asset-notes"
          value={values.notes}
          onChange={(event) => setFieldValue("notes", event.target.value)}
          placeholder="Optional notes"
          className="min-h-24"
          disabled={submitting}
        />
      </div>

      <section className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Custom fields</h3>
          <p className="text-xs text-muted-foreground">Values are based on your field definitions.</p>
        </div>

        {fieldDefinitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom fields defined.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {fieldDefinitions.map((definition) => {
              const fieldId = definition._id as string

              return (
                <div key={definition._id} className="space-y-1">
                  <DynamicField
                    definition={definition}
                    value={values.customFieldValues[fieldId] ?? null}
                    onChange={(value) => setCustomFieldValue(fieldId, value)}
                    disabled={submitting}
                  />
                  {errors[`custom:${fieldId}`] ? (
                    <p className="text-xs text-destructive">{errors[`custom:${fieldId}`]}</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" className="cursor-pointer" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
