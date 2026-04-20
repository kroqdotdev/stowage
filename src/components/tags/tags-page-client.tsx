"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  TaxonomyManager,
  type TaxonomyFormValues,
} from "@/components/catalog/taxonomy-manager";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createTag, deleteTag, listTags, updateTag } from "@/lib/api/tags";

const TAGS_QUERY_KEY = ["tags"] as const;

export function TagsPageClient() {
  const qc = useQueryClient();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: tags, isLoading: loadingTags } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: listTags,
  });

  const createM = useMutation({
    mutationFn: createTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY }),
  });
  const updateM = useMutation({
    mutationFn: (vars: {
      tagId: string;
      input: Parameters<typeof updateTag>[1];
    }) => updateTag(vars.tagId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY }),
  });
  const deleteM = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: TAGS_QUERY_KEY }),
  });

  const rows = tags ?? [];
  const loading = loadingTags || loadingUser;
  const canManage = currentUser?.role === "admin";

  async function handleCreate(values: TaxonomyFormValues) {
    await createM.mutateAsync({
      name: values.name,
      color: values.color,
    });
  }

  async function handleUpdate(tagId: string, values: TaxonomyFormValues) {
    await updateM.mutateAsync({
      tagId,
      input: { name: values.name, color: values.color },
    });
  }

  async function handleDelete(tagId: string) {
    await deleteM.mutateAsync(tagId);
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
  );
}
