"use client"

import { useMemo, useState } from "react"
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { CrudTable } from "@/components/crud/crud-table"
import { ColorField } from "@/components/crud/color-field"
import { ConfirmDialog } from "@/components/crud/confirm-dialog"
import { getConvexUiErrorMessage } from "@/components/crud/error-messages"
import { CrudModal } from "@/components/crud/modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type TaxonomyFormValues = {
  name: string
  color: string
  prefix: string
  description: string
}

type TaxonomyRowBase = {
  _id: string
  name: string
  color: string
  createdAt: number
  updatedAt: number
}

type CategoryRow = TaxonomyRowBase & {
  prefix: string | null
  description: string | null
}

type TagRow = TaxonomyRowBase

function formatUpdatedDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(timestamp)
}

function normalizeForm(values: TaxonomyFormValues, variant: "categories" | "tags") {
  return {
    name: values.name.trim(),
    color: values.color.trim(),
    prefix: variant === "categories" ? values.prefix.trim() : "",
    description: variant === "categories" ? values.description.trim() : "",
  }
}

function createInitialForm(
  variant: "categories" | "tags",
  values?: Partial<TaxonomyFormValues>,
): TaxonomyFormValues {
  return {
    name: values?.name ?? "",
    color: values?.color ?? "#2563EB",
    prefix: variant === "categories" ? (values?.prefix ?? "") : "",
    description: variant === "categories" ? (values?.description ?? "") : "",
  }
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
  variant: "categories" | "tags"
  rows: CategoryRow[] | TagRow[]
  loading: boolean
  canManage: boolean
  onCreate: (values: TaxonomyFormValues) => Promise<void>
  onUpdate: (id: string, values: TaxonomyFormValues) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const singular = variant === "categories" ? "category" : "tag"
  const singularTitle = variant === "categories" ? "Category" : "Tag"
  const pluralTitle = variant === "categories" ? "Categories" : "Tags"
  const pluralLower = variant
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [form, setForm] = useState<TaxonomyFormValues>(() => createInitialForm(variant))
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const rowsById = useMemo(() => new Map(rows.map((row) => [row._id, row])), [rows])
  const activeDeleteRow = deleteId ? rowsById.get(deleteId) ?? null : null

  function openCreate() {
    setEditorMode("create")
    setActiveId(null)
    setForm(createInitialForm(variant))
    setEditorOpen(true)
  }

  function openEdit(id: string) {
    const row = rowsById.get(id)
    if (!row) {
      return
    }
    setEditorMode("edit")
    setActiveId(id)
    setForm(
      createInitialForm(variant, {
        name: row.name,
        color: row.color,
        prefix: "prefix" in row ? (row.prefix ?? "") : "",
        description: "description" in row ? (row.description ?? "") : "",
      }),
    )
    setEditorOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const next = normalizeForm(form, variant)
    if (!next.name) {
      toast.error(`Enter a ${singular} name`)
      return
    }

    setSubmitting(true)
    try {
      if (editorMode === "create") {
        await onCreate(next)
        toast.success(`${singularTitle} created`)
      } else if (activeId) {
        await onUpdate(activeId, next)
        toast.success(`${singularTitle} updated`)
      }
      setEditorOpen(false)
      setActiveId(null)
      setForm(createInitialForm(variant))
    } catch (error) {
      const fallback = `Unable to ${editorMode === "create" ? "create" : "update"} ${singular}`
      toast.error(getConvexUiErrorMessage(error, fallback))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) {
      return
    }

    setDeleting(true)
    try {
      await onDelete(deleteId)
      toast.success(`${singularTitle} deleted`)
      setDeleteId(null)
    } catch (error) {
      toast.error(getConvexUiErrorMessage(error, `Unable to delete ${singular}`))
    } finally {
      setDeleting(false)
    }
  }

  const headers =
    variant === "categories"
      ? [
          { key: "color", label: "Color" },
          { key: "name", label: "Name" },
          { key: "prefix", label: "Prefix" },
          { key: "description", label: "Description" },
          { key: "updated", label: "Updated" },
          { key: "actions", label: "Actions", align: "right" as const },
        ]
      : [
          { key: "color", label: "Color" },
          { key: "name", label: "Name" },
          { key: "updated", label: "Updated" },
          { key: "actions", label: "Actions", align: "right" as const },
        ]

  return (
    <section className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{pluralTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {variant === "categories"
              ? "Group assets with category names, prefixes, and colors."
              : "Create reusable tags with clear colors for quick filtering."}
          </p>
          {!canManage ? (
            <p className="text-xs text-muted-foreground">Only admins can add, edit, or delete {pluralLower}.</p>
          ) : null}
        </div>
        {canManage ? (
          <Button type="button" variant="outline" className="cursor-pointer" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add {singularTitle}
          </Button>
        ) : null}
      </div>

      <div className="mt-4">
        <CrudTable
          headers={headers}
          loading={loading}
          emptyMessage={`No ${pluralLower} yet.`}
          colSpan={headers.length}
        >
          {rows.length > 0
            ? rows.map((row) => (
                <tr key={row._id} className="border-t border-border/50">
                  <td className="px-3 py-2">
                    <Badge className="gap-2 border-border/80 bg-muted/30 text-foreground">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[11px]">{row.color}</span>
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  {variant === "categories" ? (
                    <>
                      <td className="px-3 py-2 text-muted-foreground">{"prefix" in row ? (row.prefix ?? "—") : "—"}</td>
                      <td className="max-w-[22rem] px-3 py-2 text-muted-foreground">
                        <div className="truncate">{"description" in row ? (row.description ?? "—") : "—"}</div>
                      </td>
                    </>
                  ) : null}
                  <td className="px-3 py-2 text-muted-foreground">{formatUpdatedDate(row.updatedAt)}</td>
                  <td className="px-3 py-2 text-right">
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
                          <DropdownMenuItem onClick={() => openEdit(row._id)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(row._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-xs text-muted-foreground">Read only</span>
                    )}
                  </td>
                </tr>
              ))
            : null}
        </CrudTable>
      </div>

      <CrudModal
        open={editorOpen}
        onClose={() => {
          if (!submitting) {
            setEditorOpen(false)
          }
        }}
        title={editorMode === "create" ? `Add ${singularTitle}` : `Edit ${singularTitle}`}
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
        <form id="taxonomy-editor-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="taxonomy-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="taxonomy-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={variant === "categories" ? "Laptops" : "Fragile"}
              required
            />
          </div>

          {variant === "categories" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="taxonomy-prefix" className="text-sm font-medium">
                  Prefix
                </label>
                <Input
                  id="taxonomy-prefix"
                  value={form.prefix}
                  onChange={(event) => setForm((prev) => ({ ...prev, prefix: event.target.value }))}
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
              <label htmlFor="taxonomy-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="taxonomy-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
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
            setDeleteId(null)
          }
        }}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}
