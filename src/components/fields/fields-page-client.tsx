"use client";

import { useMemo, useState } from "react";
import {
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { FieldDefinitionForm } from "@/components/fields/field-definition-form";
import type { FieldDefinition } from "@/components/fields/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getConvexErrorCode } from "@/lib/convex-errors";
import { api } from "@/lib/convex-api";

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

function mapFieldDefinitionError(error: unknown, fallback: string) {
  const code = getConvexErrorCode(error);
  if (code === "INVALID_DROPDOWN_OPTIONS") {
    return "Dropdown fields need at least one option.";
  }
  if (code === "UNSAFE_TYPE_CHANGE") {
    return "This type change would invalidate existing values. Create a new field instead.";
  }
  if (code === "FIELD_IN_USE") {
    return "This field is already used by assets and cannot be deleted.";
  }
  if (code === "FORBIDDEN") {
    return "Only admins can manage custom fields.";
  }
  return getConvexUiErrorMessage(error, fallback);
}

export function FieldsPageClient() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const fieldDefinitions = useQuery(api.customFields.listFieldDefinitions, {});
  const createFieldDefinition = useMutation(
    api.customFields.createFieldDefinition,
  );
  const updateFieldDefinition = useMutation(
    api.customFields.updateFieldDefinition,
  );
  const deleteFieldDefinition = useMutation(
    api.customFields.deleteFieldDefinition,
  );
  const reorderFieldDefinitions = useMutation(
    api.customFields.reorderFieldDefinitions,
  );

  const rows = useMemo(
    () => (fieldDefinitions ?? []) as unknown as FieldDefinition[],
    [fieldDefinitions],
  );
  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row._id, row])),
    [rows],
  );
  const loading = currentUser === undefined || fieldDefinitions === undefined;
  const canManage = currentUser?.role === "admin";

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeDefinition =
    activeId !== null ? (rowsById.get(activeId as never) ?? null) : null;
  const activeDeleteDefinition =
    deleteId !== null ? (rowsById.get(deleteId as never) ?? null) : null;

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
        await createFieldDefinition(values);
        toast.success("Field created");
      } else if (activeId) {
        await updateFieldDefinition({
          fieldDefinitionId: activeId as never,
          ...values,
        });
        toast.success("Field updated");
      }
      setEditorOpen(false);
      setActiveId(null);
    } catch (error) {
      toast.error(
        mapFieldDefinitionError(
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
    if (!deleteId) {
      return;
    }

    setDeleting(true);
    try {
      await deleteFieldDefinition({ fieldDefinitionId: deleteId as never });
      toast.success("Field deleted");
      setDeleteId(null);
    } catch (error) {
      toast.error(mapFieldDefinitionError(error, "Unable to delete field"));
    } finally {
      setDeleting(false);
    }
  }

  async function saveOrder(nextIds: string[]) {
    setReordering(true);
    try {
      await reorderFieldDefinitions({ fieldDefinitionIds: nextIds as never });
    } catch (error) {
      toast.error(mapFieldDefinitionError(error, "Unable to save field order"));
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

        <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
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
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No custom fields yet.
                  </td>
                </tr>
              ) : (
                rows.map((definition) => (
                  <tr
                    key={definition._id}
                    className="border-t border-border/50"
                    draggable={canManage && !reordering}
                    onDragStart={(event) => {
                      setDraggingId(definition._id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      if (canManage) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!canManage || !draggingId) {
                        return;
                      }
                      const orderedIds = moveId(
                        rows.map((row) => row._id as string),
                        draggingId,
                        definition._id as string,
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
                    <td className="px-3 py-2 font-medium">{definition.name}</td>
                    <td className="px-3 py-2">
                      <Badge className="bg-muted/20 capitalize">
                        {definition.fieldType}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {definition.required ? (
                        <Badge className="bg-muted/20">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {definition.usageCount}
                    </td>
                    <td className="px-3 py-2 text-right">
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
                              onClick={() => openEdit(definition._id as string)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() =>
                                setDeleteId(definition._id as string)
                              }
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
                ))
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
            ? `Delete “${activeDeleteDefinition.name}”?`
            : "Delete this field?"
        }
        confirmLabel="Delete field"
        busy={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteId(null);
          }
        }}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
