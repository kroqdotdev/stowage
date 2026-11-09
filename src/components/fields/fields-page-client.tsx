"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  reorderCustomFields,
  updateCustomField,
} from "@/lib/api/custom-fields";
import { cn } from "@/lib/utils";

const FIELD_TYPE_LABELS: Record<FieldDefinition["fieldType"], string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
  url: "URL",
  currency: "Currency",
};

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

  const th =
    "h-10 border-b border-border px-3 text-left text-[13px] font-semibold whitespace-nowrap text-foreground";
  const newFieldButton = (size: "sm" | "default") =>
    canManage ? (
      <Button
        type="button"
        variant={size === "sm" ? "secondary" : "default"}
        size={size}
        onClick={openCreate}
      >
        <Plus />
        New field…
      </Button>
    ) : undefined;

  function fieldMenuItems(definition: FieldDefinition) {
    return (
      <>
        <DropdownMenuItem onSelect={() => openEdit(definition.id)}>
          <Pencil />
          Edit…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => setDeleteId(definition.id)}
        >
          <Trash2 />
          Delete…
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <>
      <section aria-labelledby="taxonomy-fields-title">
        <SheetHeading
          title={<span id="taxonomy-fields-title">Custom fields</span>}
          count={loading ? undefined : rows.length}
          aside={loading || rows.length > 0 ? newFieldButton("sm") : undefined}
        />
        <p className="px-0.5 pt-1.5 text-[13px] text-muted-foreground">
          Extra details every asset form asks for, in this order.
          {canManage ? (
            <span className="max-md:hidden"> Drag a row to reorder.</span>
          ) : (
            <span className="block">Only admins can manage fields.</span>
          )}
        </p>

        {loading ? (
          <div className="space-y-4 py-5" aria-hidden="true">
            {[50, 38, 44].map((width) => (
              <Skeleton
                key={width}
                className="h-2.5"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        ) : null}
        {loading ? <span className="sr-only">Loading...</span> : null}

        {!loading && rows.length === 0 ? (
          <EmptyState
            className="mt-2"
            icon={SlidersHorizontal}
            title="No custom fields yet."
            description="Add fields such as serial number or purchase date to capture extra asset details."
            action={newFieldButton("default")}
          />
        ) : null}

        {rows.length > 0 ? (
          <ul className="mt-2 md:hidden" data-testid="field-card-list">
            {rows.map((definition, index) => (
              <li
                key={definition.id}
                data-testid={`field-card-${definition.id}`}
                className="flex items-center justify-between gap-3 border-b border-border px-0.5 py-2.5"
              >
                <span className="w-5 shrink-0 font-mono text-[13px] font-medium text-muted-foreground">
                  {definition.sortOrder + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {definition.name}
                  </span>
                  <span className="block text-[13px] text-ink-2">
                    {FIELD_TYPE_LABELS[definition.fieldType]}
                    {definition.required ? " · Required" : null}
                    <span className="text-muted-foreground">
                      {" "}
                      · Used by {definition.usageCount}
                    </span>
                  </span>
                </div>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${definition.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        disabled={reordering || index === 0}
                        onSelect={() => {
                          const next = rows.map((row) => row.id);
                          [next[index - 1], next[index]] = [
                            next[index],
                            next[index - 1],
                          ];
                          void saveOrder(next);
                        }}
                      >
                        <ArrowUp />
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={reordering || index === rows.length - 1}
                        onSelect={() => {
                          const next = rows.map((row) => row.id);
                          [next[index], next[index + 1]] = [
                            next[index + 1],
                            next[index],
                          ];
                          void saveOrder(next);
                        }}
                      >
                        <ArrowDown />
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {fieldMenuItems(definition)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="mt-2 hidden md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={cn(th, "w-14 pl-0.5")}>Order</th>
                  <th className={th}>Name</th>
                  <th className={th}>Type</th>
                  <th className={th}>Required</th>
                  <th className={cn(th, "text-right")}>In use</th>
                  <th className={cn(th, "w-10 p-0")}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((definition) => {
                  const rowContent = (
                    <tr
                      className={cn(
                        "border-b border-border",
                        canManage && "cursor-grab active:cursor-grabbing",
                        draggingId === definition.id && "bg-secondary",
                      )}
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
                      <td className="py-2.5 pr-3 pl-0.5">
                        <span className="inline-flex items-center gap-1 font-mono text-[13px] font-medium text-muted-foreground">
                          {canManage ? (
                            <GripVertical
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          ) : null}
                          {definition.sortOrder + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">
                        {definition.name}
                      </td>
                      <td className="px-3 py-2.5 text-ink-2">
                        {FIELD_TYPE_LABELS[definition.fieldType]}
                      </td>
                      <td className="px-3 py-2.5">
                        {definition.required ? (
                          <span className="font-medium text-foreground">
                            Required
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[13px] font-medium text-ink-2">
                        {definition.usageCount}
                      </td>
                      <td className="w-10 py-1.5 pr-0.5 text-right">
                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${definition.name}`}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {fieldMenuItems(definition)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
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
                          <Pencil />
                          Edit…
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(definition.id)}
                        >
                          <Trash2 />
                          Delete…
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ) : (
                    <React.Fragment key={definition.id}>
                      {rowContent}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {reordering ? (
          <p className="mt-3 inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
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
        title="Delete field?"
        description={
          activeDeleteDefinition
            ? `${activeDeleteDefinition.name} is removed from the asset form.`
            : "This field is removed from the asset form."
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
