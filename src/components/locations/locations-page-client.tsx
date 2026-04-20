"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import {
  LocationTree,
  buildLocationChildrenMap,
  collectDescendantIds,
  type LocationTreeItem,
} from "@/components/locations/location-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
} from "@/lib/api/locations";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";

const LOCATIONS_QUERY_KEY = ["locations"] as const;

function toDraft(location: LocationTreeItem) {
  return {
    name: location.name,
    parentId: location.parentId,
    description: location.description ?? "",
  };
}

function getAncestorIds(
  locationId: string,
  byId: Map<string, LocationTreeItem>,
): string[] {
  const ancestors: string[] = [];
  let cursor = byId.get(locationId)?.parentId ?? null;

  while (cursor) {
    ancestors.push(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }

  return ancestors;
}

function buildLocationPathPreview(
  locationsById: Map<string, LocationTreeItem>,
  draft: { name: string; parentId: string | null },
) {
  const name = draft.name.trim();
  if (!name) return "";

  const parentPath = draft.parentId
    ? (locationsById.get(draft.parentId)?.path ?? null)
    : null;
  return parentPath ? `${parentPath} / ${name}` : name;
}

export function LocationsPageClient() {
  const qc = useQueryClient();
  const dateFormat = useAppDateFormat();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: locations, isLoading: loadingLocations } = useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: listLocations,
  });

  const createM = useMutation({
    mutationFn: (input: Parameters<typeof createLocation>[0]) =>
      createLocation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY }),
  });
  const updateM = useMutation({
    mutationFn: (vars: {
      id: string;
      input: Parameters<typeof updateLocation>[1];
    }) => updateLocation(vars.id, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY }),
  });
  const deleteM = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY }),
  });

  const rows = useMemo(
    () => (locations ?? []) as unknown as LocationTreeItem[],
    [locations],
  );
  const loading = loadingUser || loadingLocations;
  const canManage = currentUser?.role === "admin";

  const rowsById = useMemo(
    () => new Map(rows.map((location) => [location.id, location])),
    [rows],
  );
  const childrenByParent = useMemo(
    () => buildLocationChildrenMap(rows),
    [rows],
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelDraft, setPanelDraft] = useState<{
    name: string;
    parentId: string | null;
    description: string;
  } | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    name: string;
    parentId: string | null;
    description: string;
  }>({ name: "", parentId: null, description: "" });
  const [creating, setCreating] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedLocation = selectedId
    ? (rowsById.get(selectedId) ?? null)
    : null;

  useEffect(() => {
    if (rows.length === 0) return;
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      const roots = childrenByParent.get(null) ?? [];
      return new Set(roots.map((root) => root.id));
    });
  }, [rows.length, childrenByParent]);

  useEffect(() => {
    if (!selectedId || loadingLocations) return;
    if (!selectedLocation) {
      toast.error("The selected location is no longer available");
      setSelectedId(null);
      setPanelDraft(null);
    }
  }, [selectedId, selectedLocation, loadingLocations]);

  useEffect(() => {
    if (!selectedLocation) {
      setPanelDraft(null);
      return;
    }
    setPanelDraft(toDraft(selectedLocation));
  }, [selectedLocation]);

  function selectLocation(id: string) {
    setSelectedId(id);
    const ancestors = getAncestorIds(id, rowsById);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      for (const ancestor of ancestors) next.add(ancestor);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateRoot() {
    setCreateForm({ name: "", parentId: null, description: "" });
    setCreateDialogOpen(true);
  }

  function openCreateChild(parentId: string) {
    selectLocation(parentId);
    setCreateForm({ name: "", parentId, description: "" });
    setCreateDialogOpen(true);
  }

  const parentOptions = useMemo(() => {
    if (!selectedLocation) {
      return rows
        .slice()
        .sort((a, b) =>
          a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
        );
    }

    const descendants = collectDescendantIds(
      selectedLocation.id,
      childrenByParent,
    );
    descendants.add(selectedLocation.id);

    return rows
      .filter((location) => !descendants.has(location.id))
      .slice()
      .sort((a, b) =>
        a.path.localeCompare(b.path, undefined, { sensitivity: "base" }),
      );
  }, [rows, selectedLocation, childrenByParent]);

  const pathPreview = panelDraft
    ? buildLocationPathPreview(rowsById, panelDraft)
    : "";

  const hasPanelChanges = (() => {
    if (!selectedLocation || !panelDraft) return false;
    const selectedDescription = selectedLocation.description ?? "";
    return (
      panelDraft.name.trim() !== selectedLocation.name ||
      (panelDraft.parentId ?? null) !== (selectedLocation.parentId ?? null) ||
      panelDraft.description.trim() !== selectedDescription
    );
  })();

  async function handleCreate(values: {
    name: string;
    parentId: string | null;
    description: string | null;
  }) {
    if (!values.name.trim()) {
      toast.error("Enter a location name");
      return;
    }

    setCreating(true);
    try {
      const result = await createM.mutateAsync({
        name: values.name,
        parentId: values.parentId,
        description: values.description,
      });
      toast.success("Location created");
      setCreateDialogOpen(false);
      setCreateForm({ name: "", parentId: null, description: "" });
      selectLocation(result.id);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to create location"));
    } finally {
      setCreating(false);
    }
  }

  async function handleSavePanel() {
    if (!selectedLocation || !panelDraft) return;
    if (!panelDraft.name.trim()) {
      toast.error("Enter a location name");
      return;
    }

    setSaving(true);
    try {
      await updateM.mutateAsync({
        id: selectedLocation.id,
        input: {
          name: panelDraft.name,
          parentId: panelDraft.parentId,
          description: panelDraft.description.trim()
            ? panelDraft.description
            : null,
        },
      });
      toast.success("Location updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to update location"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await deleteM.mutateAsync(deleteId);
      toast.success("Location deleted");
      if (selectedId === deleteId) {
        setSelectedId(null);
        setPanelDraft(null);
      }
      setDeleteId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete location"));
    } finally {
      setDeleting(false);
    }
  }

  const activeDeleteLocation = deleteId
    ? (rowsById.get(deleteId) ?? null)
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <section className="flex max-h-[calc(100dvh-14rem)] flex-col rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Location tree
            </h2>
            <p className="text-sm text-muted-foreground">
              Build your storage hierarchy with parent-child locations.
            </p>
            {!canManage ? (
              <p className="text-xs text-muted-foreground">
                Only admins can change the location tree.
              </p>
            ) : null}
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={openCreateRoot}
            >
              <Plus className="h-4 w-4" />
              Add root location
            </Button>
          ) : null}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
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
                selectLocation(id);
                setDeleteId(id);
              }}
            />
          )}
        </div>
      </section>

      <section className="max-h-[calc(100dvh-14rem)] overflow-y-auto rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        {!selectedLocation || !panelDraft ? (
          <div className="flex h-full min-h-72 flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <MapPinned className="h-3.5 w-3.5" />
              Details panel
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                Select a location
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a node in the tree to edit its name, parent, and
                description.
              </p>
            </div>
            {canManage ? (
              <Button
                type="button"
                className="cursor-pointer"
                onClick={openCreateRoot}
              >
                <Plus className="h-4 w-4" />
                Add root location
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Location details
              </h2>
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
              <label className="text-sm font-medium">Parent location</label>
              <Select
                value={panelDraft.parentId ?? "__none__"}
                onValueChange={(value) =>
                  setPanelDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          parentId: value === "__none__" ? null : value,
                        }
                      : prev,
                  )
                }
                disabled={!canManage || saving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No parent (root)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No parent (root)</SelectItem>
                  {parentOptions.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="location-description"
                className="text-sm font-medium"
              >
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
              <div className="text-xs font-medium text-muted-foreground">
                Path preview
              </div>
              <div className="mt-1 text-sm">
                {pathPreview || selectedLocation.path}
              </div>
            </div>

            <div className="grid gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
              <div>
                Created:{" "}
                <span className="text-foreground">
                  {formatDateFromTimestamp(
                    selectedLocation.createdAt,
                    dateFormat,
                  )}
                </span>
              </div>
              <div>
                Updated:{" "}
                <span className="text-foreground">
                  {formatDateFromTimestamp(
                    selectedLocation.updatedAt,
                    dateFormat,
                  )}
                </span>
              </div>
            </div>

            {canManage ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => setDeleteId(selectedLocation.id)}
                      disabled={saving || deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete this location</TooltipContent>
                </Tooltip>

                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>Discard unsaved changes</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        className="cursor-pointer"
                        onClick={() => void handleSavePanel()}
                        disabled={saving || deleting || !hasPanelChanges}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {saving ? "Saving..." : "Save changes"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save location changes</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Read-only view. Ask an admin to update locations.
              </p>
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
          if (!creating) setCreateDialogOpen(false);
        }}
        onChange={setCreateForm}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete location"
        description={
          activeDeleteLocation
            ? `Delete ${activeDeleteLocation.path}?`
            : "Delete this location?"
        }
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
