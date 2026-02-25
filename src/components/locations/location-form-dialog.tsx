"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"
import { CrudModal } from "@/components/crud/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { LocationTreeItem } from "@/components/locations/location-tree"

type FormState = {
  name: string
  parentId: string | null
  description: string
}

function buildPathPreview(locations: LocationTreeItem[], form: FormState) {
  const name = form.name.trim()
  if (!name) {
    return ""
  }

  const parentPath =
    form.parentId == null
      ? null
      : locations.find((location) => location._id === form.parentId)?.path ?? null

  return parentPath ? `${parentPath} / ${name}` : name
}

export function LocationFormDialog({
  open,
  locations,
  values,
  submitting,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean
  locations: LocationTreeItem[]
  values: FormState
  submitting: boolean
  onClose: () => void
  onChange: (next: FormState) => void
  onSubmit: (values: { name: string; parentId: string | null; description: string | null }) => Promise<void>
}) {
  const sortedLocations = useMemo(
    () => locations.slice().sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" })),
    [locations],
  )
  const pathPreview = buildPathPreview(locations, values)

  return (
    <CrudModal
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose()
        }
      }}
      title="Add location"
      description="Create a root or nested location. You can change the parent later in the details panel."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-location-form"
            className="cursor-pointer"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Creating..." : "Create location"}
          </Button>
        </>
      }
    >
      <form
        id="create-location-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit({
            name: values.name,
            parentId: values.parentId,
            description: values.description.trim() ? values.description : null,
          })
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="create-location-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="create-location-name"
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
            placeholder="Shelf 3"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="create-location-parent" className="text-sm font-medium">
            Parent location
          </label>
          <select
            id="create-location-parent"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={values.parentId ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
                parentId: event.target.value ? event.target.value : null,
              })
            }
          >
            <option value="">No parent (root)</option>
            {sortedLocations.map((location) => (
              <option key={location._id} value={location._id}>
                {location.path}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="create-location-description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="create-location-description"
            value={values.description}
            onChange={(event) => onChange({ ...values, description: event.target.value })}
            placeholder="Optional note about this location"
          />
        </div>

        <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground">Path preview</div>
          <div className="mt-1 text-sm">{pathPreview || "Enter a name to preview the path"}</div>
        </div>
      </form>
    </CrudModal>
  )
}
