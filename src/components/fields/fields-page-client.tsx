"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { FieldDefinitionForm } from "@/components/fields/field-definition-form";
import type { FieldDefinition } from "@/components/fields/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  reorderCustomFields,
  updateCustomField,
} from "@/lib/api/custom-fields";

const FIELDS_QUERY_KEY = ["custom-fields"] as const;

function moveId(ids: string[], fromId: string, toId: string) {
  const fromIndex = ids.indexOf(fromId);
  const toIndex = ids.indexOf(toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return ids;
  }
  const next = ids.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function mapFieldError(error: unknown, fallback: string) {
  const message = getApiErrorMessage(error, fallback);
  if (message.includes("at least one option")) {
    return "Dropdown fields need at least one option.";
  }
  if (message.includes("type change")) {
    return "This type change would invalidate existing values. Create a new field instead.";
  }
  if (message.includes("assets") && message.includes("cannot be deleted")) {
    return "This field is already used by assets and cannot be deleted.";
  }
  return message;
}

export function FieldsPageClient() {
  const qc = useQueryClient();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: fieldDefinitions, isLoading: loadingFields } = useQuery({
    queryKey: FIELDS_QUERY_KEY,
    queryFn: listCustomFields,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: FIELDS_QUERY_KEY });

  const createM = useMutation({
    mutationFn: createCustomField,
    onSuccess: invalidate,
  });
  const updateM = useMutation({
    mutationFn: (vars: {
      id: string;
      input: Parameters<typeof updateCustomField>[1];
    }) => updateCustomField(vars.id, vars.input),
    onSuccess: invalidate,
  });
  const deleteM = useMutation({
    mutationFn: deleteCustomField,
    onSuccess: invalidate,
  });
  const reorderM = useMutation({
    mutationFn: reorderCustomFields,
    onSuccess: invalidate,
  });

  const rows = useMemo(
    () => (fieldDefinitions ?? []) as FieldDefinition[],
    [fieldDefinitions],
  );
  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const loading = loadingUser || loadingFields;
  const canManage = currentUser?.role === "admin";

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeDefinition = activeId ? (rowsById.get(activeId) ?? null) : null;
  const activeDeleteDefinition = deleteId
    ? (rowsById.get(deleteId) ?? null)
    : null;

  function openCreate() {
    setEditorMode("create");
    setActiveId(null);
    setEditorOpen(true);
  }

  function openEdit(id: string) {
    setEditorMode("edit");
    setActiveId(id);
    setEditorOpen(true);
  }

  async function handleSave(values: {
    name: string;
    fieldType: FieldDefinition["fieldType"];
    options: string[];
    required: boolean;
  }) {
    if (!values.name.trim()) {
      toast.error("Enter a field name");
      return;
    }
    setSubmitting(true);
    try {
      if (editorMode === "create") {
        await createM.mutateAsync(values);
        toast.success("Field created");
      } else if (activeId) {
        await updateM.mutateAsync({ id: activeId, input: values });
        toast.success("Field updated");
      }
      setEditorOpen(false);
      setActiveId(null);
    } catch (error) {
      toast.error(
        mapFieldError(
          error,
          editorMode === "create"
            ? "Unable to create field"
            : "Unable to update field",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteM.mutateAsync(deleteId);
      toast.success("Field deleted");
      setDeleteId(null);
    } catch (error) {
      toast.error(mapFieldError(error, "Unable to delete field"));
    } finally {
      setDeleting(false);
    }
  }

  async function saveOrder(nextIds: string[]) {
    setReordering(true);
    try {
      await reorderM.mutateAsync(nextIds);
    } catch (error) {
      toast.error(mapFieldError(error, "Unable to save field order"));
    } finally {
      setReordering(false);
      setDraggingId(null);
    }
  }

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Field definitions
            </h2>
            <p className="text-sm text-muted-foreground">
              Define reusable custom fields for assets.
            </p>
            {!canManage ? (
              <p className="text-xs text-muted-foreground">
                Only admins can manage fields.
              </p>
            ) : null}
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              Add field
            </Button>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground md:hidden">
            Loading...
          </p>
        ) : null}

        {!loading && rows.length === 0 ? (
          <div className="mt-4 md:hidden">
            <EmptyState
              icon={SlidersHorizontal}
              title="No custom fields"
              description="Define reusable fields to capture extra asset data."
              action={
                canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={openCreate}
                  >
                    <Plus className="h-4 w-4" />
                    Add field
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul
            className="mt-4 flex flex-col gap-2 md:hidden"
            data-testid="field-card-list"
          >
            {rows.map((definition) => (
              <li
                key={definition.id}
                data-testid={`field-card-${definition.id}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {definition.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className="bg-muted/20 capitalize">
                      {definition.fieldType}
                    </Badge>
                    {definition.required ? (
                      <Badge className="border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
                        Required
                      </Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      Used by {definition.usageCount}
                    </span>
                  </div>
                </div>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        aria-label={`Actions for ${definition.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openEdit(definition.id)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteId(definition.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Read only
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border/60 md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="w-10 px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Required</th>
                <th className="px-3 py-2 font-medium">In use</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={SlidersHorizontal}
                      title="No custom fields"
                      description="Define reusable fields to capture extra asset data."
                      action={
                        canManage ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={openCreate}
                          >
                            <Plus className="h-4 w-4" />
                            Add field
                          </Button>
                        ) : undefined
                      }
                      className="rounded-none border-0"
                    />
                  </td>
                </tr>
              ) : (
                rows.map((definition) => {
                  const rowContent = (
                    <tr
                      className="border-t border-border/50"
                      draggable={canManage && !reordering}
                      onDragStart={(event) => {
                        setDraggingId(definition.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(event) => {
                        if (canManage) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!canManage || !draggingId) return;
                        const orderedIds = moveId(
                          rows.map((row) => row.id),
                          draggingId,
                          definition.id,
                        );
                        void saveOrder(orderedIds);
                      }}
                    >
                      <td className="px-3 py-2">
                        <div className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/20 px-1.5 py-1 text-xs text-muted-foreground">
                          <GripVertical className="h-3.5 w-3.5" />
                          <span className="font-mono">
                            {definition.sortOrder + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {definition.name}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className="bg-muted/20 capitalize">
                          {definition.fieldType}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {definition.required ? (
                          <Badge className="bg-muted/20">Required</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {definition.usageCount}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canManage ? (
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="cursor-pointer"
                                    aria-label={`Actions for ${definition.name}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Actions</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEdit(definition.id)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteId(definition.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Read only
                          </span>
                        )}
                      </td>
                    </tr>
                  );

                  return canManage ? (
                    <ContextMenu key={definition.id}>
                      <ContextMenuTrigger asChild>
                        {rowContent}
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => openEdit(definition.id)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(definition.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : (
                    <React.Fragment key={definition.id}>
                      {rowContent}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {reordering ? (
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving order...
          </p>
        ) : null}
      </section>

      <FieldDefinitionForm
        key={`${editorMode}:${activeId ?? "new"}:${editorOpen ? "open" : "closed"}`}
        open={editorOpen}
        mode={editorMode}
        initialDefinition={activeDefinition}
        submitting={submitting}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false);
            setActiveId(null);
          }
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete field"
        description={
          activeDeleteDefinition
            ? `Delete "${activeDeleteDefinition.name}"?`
            : "Delete this field?"
        }
        confirmLabel="Delete field"
        busy={deleting}
        onClose={() => {
          if (!deleting) setDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
