"use client";

import { useMemo, useState } from "react";
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { CrudModal } from "@/components/crud/modal";
import type {
  ServiceGroupField,
  ServiceGroupFieldType,
} from "@/components/services/types";
import { SERVICE_GROUP_FIELD_TYPE_OPTIONS } from "@/components/services/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiRequestError } from "@/lib/api-client";
import {
  createServiceGroupField,
  deleteServiceGroupField,
  listServiceGroupFields,
  reorderServiceGroupFields,
  updateServiceGroupField,
} from "@/lib/api/service-groups";

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
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "Only admins can manage service group fields.";
    }
    return error.message || fallback;
  }
  return getApiErrorMessage(error, fallback);
}

function ServiceGroupFieldEditor({
  open,
  mode,
  initialField,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialField: ServiceGroupField | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    label: string;
    fieldType: ServiceGroupFieldType;
    required: boolean;
    options: string[];
  }) => Promise<void>;
}) {
  const [label, setLabel] = useState(initialField?.label ?? "");
  const [fieldType, setFieldType] = useState<ServiceGroupFieldType>(
    initialField?.fieldType ?? "text",
  );
  const [required, setRequired] = useState(initialField?.required ?? false);
  const [options, setOptions] = useState<string[]>(
    initialField?.fieldType === "select" ? initialField.options : [""],
  );

  const isSelect = fieldType === "select";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      label,
      fieldType,
      required,
      options: isSelect
        ? options.map((option) => option.trim()).filter(Boolean)
        : [],
    });
  }

  return (
    <CrudModal
      open={open}
      onClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
      title={mode === "create" ? "Add required field" : "Edit required field"}
      description="Configure the service data technicians must provide."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="service-group-field-editor-form"
            className="cursor-pointer"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Create field" : "Save changes"}
          </Button>
        </>
      }
    >
      <form
        id="service-group-field-editor-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1.5">
          <label
            htmlFor="service-group-field-label"
            className="text-sm font-medium"
          >
            Label
          </label>
          <Input
            id="service-group-field-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Confirm voltage readings"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="service-group-field-type"
            className="text-sm font-medium"
          >
            Type
          </label>
          <select
            id="service-group-field-type"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={fieldType}
            onChange={(event) =>
              setFieldType(event.target.value as ServiceGroupFieldType)
            }
          >
            {SERVICE_GROUP_FIELD_TYPE_OPTIONS.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>

        {isSelect ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Options</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                <Plus className="h-4 w-4" />
                Add option
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div
                  key={`${option}-${index}`}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={option}
                    onChange={(event) =>
                      setOptions((prev) =>
                        prev.map((value, valueIndex) =>
                          valueIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    placeholder={`Option ${index + 1}`}
                    aria-label={`Option ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setOptions((prev) =>
                        prev.length <= 1
                          ? [""]
                          : prev.filter(
                              (_, optionIndex) => optionIndex !== index,
                            ),
                      )
                    }
                    aria-label={`Remove option ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <input
            id="service-group-field-required"
            type="checkbox"
            className="h-4 w-4 rounded border border-input"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          <label
            htmlFor="service-group-field-required"
            className="text-sm font-medium"
          >
            Required
          </label>
        </div>
      </form>
    </CrudModal>
  );
}

export function ServiceGroupFieldsPanel({
  groupId,
  canManage,
}: {
  groupId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const rowsQuery = useQuery({
    queryKey: ["service-groups", groupId, "fields"],
    queryFn: () => listServiceGroupFields(groupId),
  });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createServiceGroupField>[1]) =>
      createServiceGroupField(groupId, input),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      fieldId,
      input,
    }: {
      fieldId: string;
      input: Parameters<typeof updateServiceGroupField>[1];
    }) => updateServiceGroupField(fieldId, input),
  });
  const deleteMutation = useMutation({
    mutationFn: (fieldId: string) => deleteServiceGroupField(fieldId),
  });
  const reorderMutation = useMutation({
    mutationFn: (fieldIds: string[]) =>
      reorderServiceGroupFields(groupId, fieldIds),
  });

  const fields = useMemo(
    () => (rowsQuery.data ?? []) as ServiceGroupField[],
    [rowsQuery.data],
  );
  const fieldsById = useMemo(
    () => new Map(fields.map((field) => [field.id, field])),
    [fields],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeField =
    activeFieldId === null ? null : (fieldsById.get(activeFieldId) ?? null);
  const activeDeleteField =
    deleteFieldId === null ? null : (fieldsById.get(deleteFieldId) ?? null);

  async function handleSave(values: {
    label: string;
    fieldType: ServiceGroupFieldType;
    required: boolean;
    options: string[];
  }) {
    try {
      if (editorMode === "create") {
        await createMutation.mutateAsync({
          label: values.label,
          fieldType: values.fieldType,
          required: values.required,
          options: values.options,
        });
        toast.success("Service field created");
      } else if (activeFieldId) {
        await updateMutation.mutateAsync({
          fieldId: activeFieldId,
          input: {
            label: values.label,
            fieldType: values.fieldType,
            required: values.required,
            options: values.options,
          },
        });
        toast.success("Service field updated");
      }
      setEditorOpen(false);
      setActiveFieldId(null);
      void queryClient.invalidateQueries({
        queryKey: ["service-groups", groupId, "fields"],
      });
    } catch (error) {
      toast.error(
        mapFieldError(
          error,
          editorMode === "create"
            ? "Unable to create service field"
            : "Unable to update service field",
        ),
      );
    }
  }

  async function handleDelete() {
    if (!deleteFieldId) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleteFieldId);
      toast.success("Service field deleted");
      setDeleteFieldId(null);
      void queryClient.invalidateQueries({
        queryKey: ["service-groups", groupId, "fields"],
      });
    } catch (error) {
      toast.error(mapFieldError(error, "Unable to delete service field"));
    }
  }

  async function handleReorder(nextFieldIds: string[]) {
    try {
      await reorderMutation.mutateAsync(nextFieldIds);
      void queryClient.invalidateQueries({
        queryKey: ["service-groups", groupId, "fields"],
      });
    } catch (error) {
      toast.error(mapFieldError(error, "Unable to reorder service fields"));
    } finally {
      setDraggingId(null);
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending;
  const reordering = reorderMutation.isPending;

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Required record fields
            </h3>
            <p className="text-xs text-muted-foreground">
              Drag to reorder the fields shown when a service record is logged.
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setEditorMode("create");
                setActiveFieldId(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add field
            </Button>
          ) : null}
        </div>

        {rowsQuery.isPending ? (
          <p className="mt-4 text-sm text-muted-foreground md:hidden">
            Loading service fields...
          </p>
        ) : fields.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground md:hidden">
            No fields yet. Add required service fields for this group.
          </p>
        ) : (
          <ul
            className="mt-4 flex flex-col gap-2 md:hidden"
            data-testid="service-group-fields-card-list"
          >
            {fields.map((field) => (
              <li
                key={field.id}
                data-testid={`service-group-field-card-${field.id}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate text-sm font-semibold">
                    {field.label}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className="bg-muted/20 capitalize">
                      {field.fieldType}
                    </Badge>
                    {field.required ? (
                      <Badge className="border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
                        Required
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer"
                      onClick={() => {
                        setEditorMode("edit");
                        setActiveFieldId(field.id);
                        setEditorOpen(true);
                      }}
                      aria-label={`Edit field ${field.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer text-destructive"
                      onClick={() => setDeleteFieldId(field.id)}
                      aria-label={`Delete field ${field.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Read only
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border/60 md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="w-10 px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Required</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsQuery.isPending ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Loading service fields...
                  </td>
                </tr>
              ) : fields.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No fields yet. Add required service fields for this group.
                  </td>
                </tr>
              ) : (
                fields.map((field) => (
                  <tr
                    key={field.id}
                    className="border-t border-border/50"
                    draggable={canManage && !reordering}
                    onDragStart={(event) => {
                      setDraggingId(field.id);
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
                        fields.map((row) => row.id),
                        draggingId,
                        field.id,
                      );
                      void handleReorder(orderedIds);
                    }}
                  >
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/20 px-1.5 py-1 text-xs text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                        <span className="font-mono">{field.sortOrder + 1}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium">{field.label}</td>
                    <td className="px-3 py-2">
                      <Badge className="bg-muted/20 capitalize">
                        {field.fieldType}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {field.required ? (
                        <Badge className="bg-muted/20">Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canManage ? (
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            onClick={() => {
                              setEditorMode("edit");
                              setActiveFieldId(field.id);
                              setEditorOpen(true);
                            }}
                            aria-label={`Edit field ${field.label}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer text-destructive"
                            onClick={() => setDeleteFieldId(field.id)}
                            aria-label={`Delete field ${field.label}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      <ServiceGroupFieldEditor
        key={`${editorMode}-${activeFieldId ?? "new"}-${editorOpen ? "open" : "closed"}`}
        open={editorOpen}
        mode={editorMode}
        initialField={activeField}
        submitting={submitting}
        onClose={() => {
          setEditorOpen(false);
          setActiveFieldId(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={deleteFieldId !== null}
        title="Delete field"
        description={`Delete ${activeDeleteField?.label ?? "this field"}?`}
        confirmLabel="Delete field"
        busy={deleteMutation.isPending}
        onConfirm={() => {
          void handleDelete();
        }}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteFieldId(null);
          }
        }}
      />
    </>
  );
}
