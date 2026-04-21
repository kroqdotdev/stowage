"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ColorField } from "@/components/crud/color-field";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { CrudModal } from "@/components/crud/modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type TaxonomyFormValues = {
  name: string;
  color: string;
  prefix: string;
  description: string;
};

type TaxonomyRowBase = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

type CategoryRow = TaxonomyRowBase & {
  prefix: string | null;
  description: string | null;
};

type TagRow = TaxonomyRowBase;

function normalizeForm(
  values: TaxonomyFormValues,
  variant: "categories" | "tags",
) {
  return {
    name: values.name.trim(),
    color: values.color.trim(),
    prefix: variant === "categories" ? values.prefix.trim() : "",
    description: variant === "categories" ? values.description.trim() : "",
  };
}

function createInitialForm(
  variant: "categories" | "tags",
  values?: Partial<TaxonomyFormValues>,
): TaxonomyFormValues {
  return {
    name: values?.name ?? "",
    color: values?.color ?? "#EA580C",
    prefix: variant === "categories" ? (values?.prefix ?? "") : "",
    description: variant === "categories" ? (values?.description ?? "") : "",
  };
}

export function TaxonomyManager({
  variant,
  rows,
  loading,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: {
  variant: "categories" | "tags";
  rows: CategoryRow[] | TagRow[];
  loading: boolean;
  canManage: boolean;
  onCreate: (values: TaxonomyFormValues) => Promise<void>;
  onUpdate: (id: string, values: TaxonomyFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const singular = variant === "categories" ? "category" : "tag";
  const singularTitle = variant === "categories" ? "Category" : "Tag";
  const pluralTitle = variant === "categories" ? "Categories" : "Tags";
  const pluralLower = variant;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<TaxonomyFormValues>(() =>
    createInitialForm(variant),
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );
  const activeDeleteRow = deleteId ? (rowsById.get(deleteId) ?? null) : null;

  function openCreate() {
    setEditorMode("create");
    setActiveId(null);
    setForm(createInitialForm(variant));
    setEditorOpen(true);
  }

  function openEdit(id: string) {
    const row = rowsById.get(id);
    if (!row) {
      return;
    }
    setEditorMode("edit");
    setActiveId(id);
    setForm(
      createInitialForm(variant, {
        name: row.name,
        color: row.color,
        prefix: "prefix" in row ? (row.prefix ?? "") : "",
        description: "description" in row ? (row.description ?? "") : "",
      }),
    );
    setEditorOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = normalizeForm(form, variant);
    if (!next.name) {
      toast.error(`Enter a ${singular} name`);
      return;
    }

    setSubmitting(true);
    try {
      if (editorMode === "create") {
        await onCreate(next);
        toast.success(`${singularTitle} created`);
      } else if (activeId) {
        await onUpdate(activeId, next);
        toast.success(`${singularTitle} updated`);
      }
      setEditorOpen(false);
      setActiveId(null);
      setForm(createInitialForm(variant));
    } catch (error) {
      const fallback = `Unable to ${editorMode === "create" ? "create" : "update"} ${singular}`;
      toast.error(getApiErrorMessage(error, fallback));
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
      await onDelete(deleteId);
      toast.success(`${singularTitle} deleted`);
      setDeleteId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Unable to delete ${singular}`));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {pluralTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {variant === "categories"
              ? "Group assets with category names, prefixes, and colors."
              : "Create reusable tags with clear colors for quick filtering."}
          </p>
          {!canManage ? (
            <p className="text-xs text-muted-foreground">
              Only admins can add, edit, or delete {pluralLower}.
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
            Add {singularTitle}
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No {pluralLower} yet.
          </p>
        ) : variant === "categories" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const catRow = row as CategoryRow;
              return (
                <div
                  key={row.id}
                  className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/assets?category=${row.id}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <span
                        className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/10"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="font-semibold">{row.name}</span>
                    </Link>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            aria-label={`Actions for ${row.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(row.id)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  {catRow.prefix ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Prefix: {catRow.prefix}
                    </p>
                  ) : null}
                  {catRow.description ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {catRow.description}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-sm shadow-sm transition hover:border-primary/30"
              >
                <Link
                  href={`/assets?tag=${row.id}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="font-medium">{row.name}</span>
                </Link>
                {canManage ? (
                  <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      className="cursor-pointer rounded p-0.5 hover:bg-muted"
                      onClick={() => openEdit(row.id)}
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded p-0.5 hover:bg-destructive/10"
                      onClick={() => setDeleteId(row.id)}
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <CrudModal
        open={editorOpen}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false);
          }
        }}
        title={
          editorMode === "create"
            ? `Add ${singularTitle}`
            : `Edit ${singularTitle}`
        }
        description={
          variant === "categories"
            ? "Use short, clear names. Prefix and description are optional."
            : "Use short names and distinct colors for readability."
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditorOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              form="taxonomy-editor-form"
              type="submit"
              className="cursor-pointer"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting
                ? editorMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : editorMode === "create"
                  ? `Create ${singularTitle}`
                  : "Save changes"}
            </Button>
          </>
        }
      >
        <form
          id="taxonomy-editor-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="taxonomy-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="taxonomy-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder={variant === "categories" ? "Laptops" : "Fragile"}
              required
            />
          </div>

          {variant === "categories" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="taxonomy-prefix"
                  className="text-sm font-medium"
                >
                  Prefix
                </label>
                <Input
                  id="taxonomy-prefix"
                  value={form.prefix}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, prefix: event.target.value }))
                  }
                  placeholder="LAP"
                />
              </div>
              <ColorField
                id="taxonomy-color"
                value={form.color}
                onChange={(color) => setForm((prev) => ({ ...prev, color }))}
              />
            </div>
          ) : (
            <ColorField
              id="taxonomy-color"
              value={form.color}
              onChange={(color) => setForm((prev) => ({ ...prev, color }))}
            />
          )}

          {variant === "categories" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="taxonomy-description"
                className="text-sm font-medium"
              >
                Description
              </label>
              <Textarea
                id="taxonomy-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional note about when to use this category"
              />
            </div>
          ) : null}
        </form>
      </CrudModal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={`Delete ${singularTitle}`}
        description={
          activeDeleteRow
            ? `Delete ${activeDeleteRow.name}?`
            : `Delete this ${singular}?`
        }
        busy={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteId(null);
          }
        }}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
