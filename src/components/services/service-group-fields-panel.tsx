"use client";

import { useMemo, useState } from "react";
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getConvexUiErrorMessage } from "@/components/crud/error-messages";
import { CrudModal } from "@/components/crud/modal";
import type {
  ServiceGroupField,
  ServiceGroupFieldType,
} from "@/components/services/types";
import { SERVICE_GROUP_FIELD_TYPE_OPTIONS } from "@/components/services/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/convex-api";
import { getConvexErrorCode } from "@/lib/convex-errors";
import type { Id } from "@/lib/convex-api";

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
  const code = getConvexErrorCode(error);
  if (code === "INVALID_FIELD_VALUE") {
    return getConvexUiErrorMessage(
      error,
      "One or more field values are invalid.",
    );
  }
  if (code === "FORBIDDEN") {
    return "Only admins can manage service group fields.";
  }
  return getConvexUiErrorMessage(error, fallback);
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
                  key={`${index}-${option}`}
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
  groupId: Id<"serviceGroups">;
  canManage: boolean;
}) {
  const rows = useQuery(api.serviceGroupFields.listFields, { groupId });
  const createField = useMutation(api.serviceGroupFields.createField);
  const updateField = useMutation(api.serviceGroupFields.updateField);
  const deleteField = useMutation(api.serviceGroupFields.deleteField);
  const reorderFields = useMutation(api.serviceGroupFields.reorderFields);

  const fields = useMemo(() => (rows ?? []) as ServiceGroupField[], [rows]);
  const fieldsById = useMemo(
    () => new Map(fields.map((field) => [field._id as string, field])),
    [fields],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
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
    setSubmitting(true);
    try {
      if (editorMode === "create") {
        await createField({
          groupId,
          label: values.label,
          fieldType: values.fieldType,
          required: values.required,
          options: values.options,
        });
        toast.success("Service field created");
      } else if (activeFieldId) {
        await updateField({
          fieldId: activeFieldId as Id<"serviceGroupFields">,
          label: values.label,
          fieldType: values.fieldType,
          required: values.required,
          options: values.options,
        });
        toast.success("Service field updated");
      }
      setEditorOpen(false);
      setActiveFieldId(null);
    } catch (error) {
      toast.error(
        mapFieldError(
          error,
          editorMode === "create"
            ? "Unable to create service field"
            : "Unable to update service field",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteFieldId) {
      return;
    }
    setDeleting(true);
    try {
      await deleteField({
        fieldId: deleteFieldId as Id<"serviceGroupFields">,
      });
      toast.success("Service field deleted");
      setDeleteFieldId(null);
    } catch (error) {
      toast.error(mapFieldError(error, "Unable to delete service field"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleReorder(nextFieldIds: string[]) {
    setReordering(true);
    try {
      await reorderFields({
        groupId,
        fieldIds: nextFieldIds as Id<"serviceGroupFields">[],
      });
    } catch (error) {
      toast.error(mapFieldError(error, "Unable to reorder service fields"));
    } finally {
      setReordering(false);
      setDraggingId(null);
    }
  }

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

        <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
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
              {rows === undefined ? (
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
                    key={field._id}
                    className="border-t border-border/50"
                    draggable={canManage && !reordering}
                    onDragStart={(event) => {
                      setDraggingId(field._id as string);
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
                        fields.map((row) => row._id as string),
                        draggingId,
                        field._id as string,
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
                              setActiveFieldId(field._id as string);
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
                            onClick={() =>
                              setDeleteFieldId(field._id as string)
                            }
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
        busy={deleting}
        onConfirm={() => {
          void handleDelete();
        }}
        onClose={() => {
          if (!deleting) {
            setDeleteFieldId(null);
          }
        }}
      />
    </>
  );
}
