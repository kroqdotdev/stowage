"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import {
  Hash,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import { CrudModal } from "@/components/crud/modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SheetHeading } from "@/components/ui/sheet-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { KeywordChip } from "@/components/ui/tag-chip";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  // User-facing copy calls free-form tags "keywords"; the printed asset ID
  // is the tag.
  const singular = variant === "categories" ? "category" : "keyword";
  const singularTitle = variant === "categories" ? "Category" : "Keyword";
  const pluralTitle = variant === "categories" ? "Categories" : "Keywords";
  const pluralLower = variant === "categories" ? "categories" : "keywords";
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

  function rowMenu(row: TaxonomyRowBase) {
    if (!canManage) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${row.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => openEdit(row.id)}>
            <Pencil />
            Edit…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteId(row.id)}
          >
            <Trash2 />
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const th =
    "h-10 border-b border-border px-3 text-left text-[13px] font-semibold whitespace-nowrap text-foreground";

  return (
    <section aria-labelledby={`taxonomy-${variant}-title`}>
      <SheetHeading
        title={<span id={`taxonomy-${variant}-title`}>{pluralTitle}</span>}
        count={loading ? undefined : rows.length}
        aside={
          canManage && (loading || rows.length > 0) ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openCreate}
            >
              <Plus />
              New {singular}…
            </Button>
          ) : null
        }
      />
      <p className="px-0.5 pt-1.5 text-[13px] text-muted-foreground">
        {variant === "categories"
          ? "Each asset has one category. The prefix starts its printed tag."
          : "Free-form labels for finding assets. An asset can have several."}
        {!canManage ? (
          <span className="block">
            Only admins can add, edit, or delete {pluralLower}.
          </span>
        ) : null}
      </p>

      <div className="mt-2">
        {loading ? (
          <div className="space-y-4 py-4" aria-hidden="true">
            {[55, 40, 48].map((width) => (
              <Skeleton
                key={width}
                className="h-2.5"
                style={{ width: `${width}%` }}
              />
            ))}
            <span className="sr-only">Loading...</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={variant === "categories" ? Layers : Hash}
            title={`No ${pluralLower} yet.`}
            description={
              variant === "categories"
                ? "Categories group assets, such as Power tools or Ladders."
                : "Keywords are labels such as fragile or loan, for finding assets."
            }
            action={
              canManage ? (
                <Button type="button" onClick={openCreate}>
                  <Plus />
                  New {singular}…
                </Button>
              ) : null
            }
          />
        ) : variant === "categories" ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={cn(th, "pl-0.5")}>Name</th>
                <th className={cn(th, "w-[1%]")}>Prefix</th>
                <th className={cn(th, "w-10 p-0")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(rows as CategoryRow[]).map((row) => (
                <tr key={row.id} className="border-b border-border">
                  <td className="py-2.5 pr-3 pl-0.5">
                    <Link
                      href={`/assets?category=${row.id}`}
                      className="font-semibold text-foreground hover:underline hover:underline-offset-[3px]"
                    >
                      {row.name}
                    </Link>
                    {row.description ? (
                      <span className="mt-0.5 block max-w-[70ch] text-[13px] text-ink-2">
                        {row.description}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[13px] font-medium whitespace-nowrap text-ink-2">
                    {row.prefix ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="w-10 py-1.5 pr-0.5 text-right">
                    {rowMenu(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex min-h-12 items-center gap-2 border-b border-border px-0.5"
              >
                <Link
                  href={`/assets?tag=${row.id}`}
                  className="min-w-0 flex-1 rounded-md"
                  aria-label={`Assets with keyword ${row.name}`}
                >
                  <KeywordChip className="max-w-full truncate hover:bg-line-2">
                    {row.name}
                  </KeywordChip>
                </Link>
                {rowMenu(row)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CrudModal
        open={editorOpen}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false);
          }
        }}
        title={editorMode === "create" ? `New ${singular}` : `Edit ${singular}`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              form="taxonomy-editor-form"
              type="submit"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" /> : null}
              {submitting
                ? editorMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : editorMode === "create"
                  ? `Create ${singular}`
                  : `Save ${singular}`}
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
            <label htmlFor="taxonomy-name" className="text-sm font-semibold">
              Name
            </label>
            <Input
              id="taxonomy-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder={variant === "categories" ? "Power tools" : "fragile"}
              required
            />
          </div>

          {variant === "categories" ? (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="taxonomy-prefix"
                  className="text-sm font-semibold"
                >
                  Prefix{" "}
                  <span className="font-normal text-muted-foreground">
                    optional
                  </span>
                </label>
                <Input
                  id="taxonomy-prefix"
                  value={form.prefix}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, prefix: event.target.value }))
                  }
                  placeholder="PT"
                  className="w-32 font-mono uppercase"
                  aria-describedby="taxonomy-prefix-hint"
                />
                <p
                  id="taxonomy-prefix-hint"
                  className="text-[13px] text-muted-foreground"
                >
                  New assets in this category get tags like{" "}
                  <span className="font-mono whitespace-nowrap">
                    {(form.prefix.trim() || "AST").toUpperCase()}-0001
                  </span>
                  {form.prefix.trim() ? "." : ", the default prefix."}
                </p>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="taxonomy-description"
                  className="text-sm font-semibold"
                >
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    optional
                  </span>
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
                  placeholder="When to use this category"
                />
              </div>
            </>
          ) : null}
        </form>
      </CrudModal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={`Delete ${singular}?`}
        description={
          activeDeleteRow
            ? variant === "categories"
              ? `${activeDeleteRow.name} is deleted. Its assets keep their records but lose their category.`
              : `${activeDeleteRow.name} is deleted and removed from every asset that has it.`
            : `This ${singular} is deleted.`
        }
        confirmLabel={`Delete ${singular}`}
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
