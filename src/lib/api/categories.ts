import { apiFetch } from "@/lib/api-client";

export type Category = {
  id: string;
  name: string;
  prefix: string | null;
  description: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export async function listCategories(): Promise<Category[]> {
  const { categories } = await apiFetch<{ categories: Category[] }>(
    "/api/categories",
  );
  return categories;
}

export async function createCategory(input: {
  name: string;
  color: string;
  prefix?: string | null;
  description?: string | null;
}): Promise<Category> {
  const { category } = await apiFetch<{ category: Category }>(
    "/api/categories",
    { method: "POST", body: input },
  );
  return category;
}

export async function updateCategory(
  categoryId: string,
  input: {
    name: string;
    color: string;
    prefix?: string | null;
    description?: string | null;
  },
): Promise<Category> {
  const { category } = await apiFetch<{ category: Category }>(
    `/api/categories/${categoryId}`,
    { method: "PATCH", body: input },
  );
  return category;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await apiFetch(`/api/categories/${categoryId}`, { method: "DELETE" });
}
