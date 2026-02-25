"use client"

import { useMutation, useQuery } from "convex/react"
import { TaxonomyManager, type TaxonomyFormValues } from "@/components/catalog/taxonomy-manager"
import { api } from "@/lib/convex-api"

export function TagsPageClient() {
  const currentUser = useQuery(api.users.getCurrentUser, {})
  const tags = useQuery(api.tags.listTags, {})
  const createTag = useMutation(api.tags.createTag)
  const updateTag = useMutation(api.tags.updateTag)
  const deleteTag = useMutation(api.tags.deleteTag)

  const rows = tags ?? []
  const loading = tags === undefined || currentUser === undefined
  const canManage = currentUser?.role === "admin"

  async function handleCreate(values: TaxonomyFormValues) {
    await createTag({
      name: values.name,
      color: values.color,
    })
  }

  async function handleUpdate(tagId: string, values: TaxonomyFormValues) {
    await updateTag({
      tagId: tagId as never,
      name: values.name,
      color: values.color,
    })
  }

  async function handleDelete(tagId: string) {
    await deleteTag({ tagId: tagId as never })
  }

  return (
    <TaxonomyManager
      variant="tags"
      rows={rows as never}
      loading={loading}
      canManage={canManage}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
