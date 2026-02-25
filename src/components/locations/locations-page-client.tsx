"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MapPinned, Plus, RefreshCw, Save, Trash2 } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/crud/confirm-dialog"
import { getConvexUiErrorMessage } from "@/components/crud/error-messages"
import { LocationFormDialog } from "@/components/locations/location-form-dialog"
import {
  LocationTree,
  buildLocationChildrenMap,
  collectDescendantIds,
  type LocationTreeItem,
} from "@/components/locations/location-tree"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/convex-api"

function toDraft(location: LocationTreeItem) {
  return {
    name: location.name,
    parentId: location.parentId,
    description: location.description ?? "",
  }
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(timestamp)
}

function getAncestorIds(
  locationId: string,
  byId: Map<string, LocationTreeItem>,
): string[] {
  const ancestors: string[] = []
  let cursor = byId.get(locationId)?.parentId ?? null

  while (cursor) {
    ancestors.push(cursor)
    cursor = byId.get(cursor)?.parentId ?? null
  }

  return ancestors
}

function buildLocationPathPreview(
  locationsById: Map<string, LocationTreeItem>,
  draft: { name: string; parentId: string | null },
) {
  const name = draft.name.trim()
  if (!name) {
    return ""
  }

  const parentPath = draft.parentId ? locationsById.get(draft.parentId)?.path ?? null : null
  return parentPath ? `${parentPath} / ${name}` : name
}

export function LocationsPageClient() {
  const currentUser = useQuery(api.users.getCurrentUser, {})
  const locations = useQuery(api.locations.listLocations, {})
  const createLocation = useMutation(api.locations.createLocation)
  const updateLocation = useMutation(api.locations.updateLocation)
  const deleteLocation = useMutation(api.locations.deleteLocation)

  const rows = useMemo(
    () => ((locations ?? []) as unknown as LocationTreeItem[]),
    [locations],
  )
  const loading = currentUser === undefined || locations === undefined
  const canManage = currentUser?.role === "admin"

  const rowsById = useMemo(
    () => new Map(rows.map((location) => [location._id, location])),
    [rows],
  )
  const childrenByParent = useMemo(() => buildLocationChildrenMap(rows), [rows])

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelDraft, setPanelDraft] = useState<{
    name: string
    parentId: string | null
    description: string
  } | null>(null)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState<{
    name: string
    parentId: string | null
    description: string
  }>({ name: "", parentId: null, description: "" })
  const [creating, setCreating] = useState(false)

  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedLocation = selectedId ? rowsById.get(selectedId) ?? null : null

  useEffect(() => {
    if (rows.length === 0) {
      return
    }

    setExpandedIds((prev) => {
      if (prev.size > 0) {
        return prev
      }
      const roots = childrenByParent.get(null) ?? []
      return new Set(roots.map((root) => root._id))
    })
  }, [rows.length, childrenByParent])

  useEffect(() => {
    if (!selectedId || locations === undefined) {
      return
    }

    if (!selectedLocation) {
      toast.error("The selected location is no longer available")
      setSelectedId(null)
      setPanelDraft(null)
    }
  }, [selectedId, selectedLocation, locations])

  useEffect(() => {
    if (!selectedLocation) {
      setPanelDraft(null)
      return
    }

    setPanelDraft(toDraft(selectedLocation))
  }, [selectedLocation])

  function selectLocation(id: string) {
    setSelectedId(id)
    const ancestors = getAncestorIds(id, rowsById)
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      for (const ancestor of ancestors) {
        next.add(ancestor)
      }
      return next
    })
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function openCreateRoot() {
    setCreateForm({ name: "", parentId: null, description: "" })
    setCreateDialogOpen(true)
  }

  function openCreateChild(parentId: string) {
    selectLocation(parentId)
    setCreateForm({ name: "", parentId, description: "" })
    setCreateDialogOpen(true)
  }

  const parentOptions = useMemo(() => {
    if (!selectedLocation) {
      return rows.slice().sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }))
    }

    const descendants = collectDescendantIds(selectedLocation._id, childrenByParent)
    descendants.add(selectedLocation._id)

    return rows
      .filter((location) => !descendants.has(location._id))
      .slice()
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }))
  }, [rows, selectedLocation, childrenByParent])

  const pathPreview = panelDraft ? buildLocationPathPreview(rowsById, panelDraft) : ""

  const hasPanelChanges = (() => {
    if (!selectedLocation || !panelDraft) {
      return false
    }

    const selectedDescription = selectedLocation.description ?? ""
    return (
      panelDraft.name.trim() !== selectedLocation.name ||
      (panelDraft.parentId ?? null) !== (selectedLocation.parentId ?? null) ||
      panelDraft.description.trim() !== selectedDescription
    )
  })()

  async function handleCreate(values: {
    name: string
    parentId: string | null
    description: string | null
  }) {
    if (!values.name.trim()) {
      toast.error("Enter a location name")
      return
    }

    setCreating(true)
    try {
      const result = await createLocation({
        name: values.name,
        parentId: values.parentId as never,
        description: values.description,
      })
      toast.success("Location created")
      setCreateDialogOpen(false)
      setCreateForm({ name: "", parentId: null, description: "" })
      selectLocation(result.locationId as unknown as string)
    } catch (error) {
      toast.error(getConvexUiErrorMessage(error, "Unable to create location"))
    } finally {
      setCreating(false)
    }
  }

  async function handleSavePanel() {
    if (!selectedLocation || !panelDraft) {
      return
    }

    if (!panelDraft.name.trim()) {
      toast.error("Enter a location name")
      return
    }

    setSaving(true)
    try {
      await updateLocation({
        locationId: selectedLocation._id as never,
        name: panelDraft.name,
        parentId: panelDraft.parentId as never,
        description: panelDraft.description.trim() ? panelDraft.description : null,
      })
      toast.success("Location updated")
    } catch (error) {
      toast.error(getConvexUiErrorMessage(error, "Unable to update location"))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) {
      return
    }

    setDeleting(true)
    try {
      await deleteLocation({ locationId: deleteId as never })
      toast.success("Location deleted")
      if (selectedId === deleteId) {
        setSelectedId(null)
        setPanelDraft(null)
      }
      setDeleteId(null)
    } catch (error) {
      toast.error(getConvexUiErrorMessage(error, "Unable to delete location"))
    } finally {
      setDeleting(false)
    }
  }

  const activeDeleteLocation = deleteId ? rowsById.get(deleteId) ?? null : null

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Location tree</h2>
            <p className="text-sm text-muted-foreground">
              Build your storage hierarchy with parent-child locations.
            </p>
            {!canManage ? (
              <p className="text-xs text-muted-foreground">Only admins can change the location tree.</p>
            ) : null}
          </div>
          {canManage ? (
            <Button type="button" variant="outline" className="cursor-pointer" onClick={openCreateRoot}>
              <Plus className="h-4 w-4" />
              Add root location
            </Button>
          ) : null}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-lg border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Loading locations...
            </div>
          ) : (
            <LocationTree
              locations={rows}
              selectedId={selectedId}
              expandedIds={expandedIds}
              canManage={canManage}
              onToggleExpand={toggleExpand}
              onSelect={selectLocation}
              onAddChild={openCreateChild}
              onDelete={(id) => {
                selectLocation(id)
                setDeleteId(id)
              }}
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        {!selectedLocation || !panelDraft ? (
          <div className="flex h-full min-h-72 flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <MapPinned className="h-3.5 w-3.5" />
              Details panel
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">Select a location</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a node in the tree to edit its name, parent, and description.
              </p>
            </div>
            {canManage ? (
              <Button type="button" className="cursor-pointer" onClick={openCreateRoot}>
                <Plus className="h-4 w-4" />
                Add root location
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Location details</h2>
              <p className="text-sm text-muted-foreground">
                Update the selected location or move it to a different parent.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="location-name"
                value={panelDraft.name}
                onChange={(event) =>
                  setPanelDraft((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev,
                  )
                }
                disabled={!canManage || saving}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location-parent" className="text-sm font-medium">
                Parent location
              </label>
              <select
                id="location-parent"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={panelDraft.parentId ?? ""}
                onChange={(event) =>
                  setPanelDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          parentId: event.target.value ? event.target.value : null,
                        }
                      : prev,
                  )
                }
                disabled={!canManage || saving}
              >
                <option value="">No parent (root)</option>
                {parentOptions.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.path}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="location-description"
                value={panelDraft.description}
                onChange={(event) =>
                  setPanelDraft((prev) =>
                    prev ? { ...prev, description: event.target.value } : prev,
                  )
                }
                placeholder="Optional note about this location"
                disabled={!canManage || saving}
              />
            </div>

            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <div className="text-xs font-medium text-muted-foreground">Path preview</div>
              <div className="mt-1 text-sm">{pathPreview || selectedLocation.path}</div>
            </div>

            <div className="grid gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
              <div>
                Created: <span className="text-foreground">{formatTimestamp(selectedLocation.createdAt)}</span>
              </div>
              <div>
                Updated: <span className="text-foreground">{formatTimestamp(selectedLocation.updatedAt)}</span>
              </div>
            </div>

            {canManage ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => setDeleteId(selectedLocation._id)}
                  disabled={saving || deleting}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setPanelDraft(toDraft(selectedLocation))}
                    disabled={saving || deleting || !hasPanelChanges}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="cursor-pointer"
                    onClick={() => void handleSavePanel()}
                    disabled={saving || deleting || !hasPanelChanges}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Read-only view. Ask an admin to update locations.</p>
            )}
          </div>
        )}
      </section>

      <LocationFormDialog
        open={createDialogOpen}
        locations={rows}
        values={createForm}
        submitting={creating}
        onClose={() => {
          if (!creating) {
            setCreateDialogOpen(false)
          }
        }}
        onChange={setCreateForm}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete location"
        description={activeDeleteLocation ? `Delete ${activeDeleteLocation.path}?` : "Delete this location?"}
        busy={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteId(null)
          }
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
