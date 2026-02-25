"use client"

import { useMutation, useQuery } from "convex/react"
import { TaxonomyManager, type TaxonomyFormValues } from "@/components/catalog/taxonomy-manager"
import { api } from "@/lib/convex-api"

export function CategoriesPageClient() {
  const currentUser = useQuery(api.users.getCurrentUser, {})
  const categories = useQuery(api.categories.listCategories, {})
  const createCategory = useMutation(api.categories.createCategory)
  const updateCategory = useMutation(api.categories.updateCategory)
  const deleteCategory = useMutation(api.categories.deleteCategory)

  const rows = categories ?? []
  const loading = categories === undefined || currentUser === undefined
  const canManage = currentUser?.role === "admin"

  async function handleCreate(values: TaxonomyFormValues) {
    await createCategory({
      name: values.name,
      prefix: values.prefix || null,
      description: values.description || null,
      color: values.color,
    })
  }

  async function handleUpdate(categoryId: string, values: TaxonomyFormValues) {
    await updateCategory({
      categoryId: categoryId as never,
      name: values.name,
      prefix: values.prefix || null,
      description: values.description || null,
      color: values.color,
    })
  }

  async function handleDelete(categoryId: string) {
    await deleteCategory({ categoryId: categoryId as never })
  }

  return (
    <TaxonomyManager
      variant="categories"
      rows={rows as never}
      loading={loading}
      canManage={canManage}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
