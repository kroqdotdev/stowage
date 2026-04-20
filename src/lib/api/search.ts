import { apiFetch } from "@/lib/api-client";

export type SearchResult = {
  id: string;
  name: string;
  assetTag: string;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  locationPath: string | null;
  score: number;
};

export async function searchAssets(query: string): Promise<SearchResult[]> {
  const { results } = await apiFetch<{ results: SearchResult[] }>(
    `/api/search?q=${encodeURIComponent(query)}`,
  );
  return results;
}
