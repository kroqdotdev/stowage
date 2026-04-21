"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  TaxonomyManager,
  type TaxonomyFormValues,
} from "@/components/catalog/taxonomy-manager";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/api/categories";

const CATEGORIES_QUERY_KEY = ["categories"] as const;

export function CategoriesPageClient() {
  const qc = useQueryClient();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: listCategories,
  });

  const createM = useMutation({
    mutationFn: createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  });
  const updateM = useMutation({
    mutationFn: (vars: {
      categoryId: string;
      input: Parameters<typeof updateCategory>[1];
    }) => updateCategory(vars.categoryId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  });
  const deleteM = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  });

  const rows = categories ?? [];
  const loading = loadingCategories || loadingUser;
  const canManage = currentUser?.role === "admin";

  async function handleCreate(values: TaxonomyFormValues) {
    await createM.mutateAsync({
      name: values.name,
      prefix: values.prefix || null,
      description: values.description || null,
      color: values.color,
    });
  }

  async function handleUpdate(categoryId: string, values: TaxonomyFormValues) {
    await updateM.mutateAsync({
      categoryId,
      input: {
        name: values.name,
        prefix: values.prefix || null,
        description: values.description || null,
        color: values.color,
      },
    });
  }

  async function handleDelete(categoryId: string) {
    await deleteM.mutateAsync(categoryId);
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
  );
}
