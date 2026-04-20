import { apiFetch } from "@/lib/api-client";

export type Tag = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export async function listTags(): Promise<Tag[]> {
  const { tags } = await apiFetch<{ tags: Tag[] }>("/api/tags");
  return tags;
}

export async function createTag(input: {
  name: string;
  color: string;
}): Promise<Tag> {
  const { tag } = await apiFetch<{ tag: Tag }>("/api/tags", {
    method: "POST",
    body: input,
  });
  return tag;
}

export async function updateTag(
  tagId: string,
  input: { name: string; color: string },
): Promise<Tag> {
  const { tag } = await apiFetch<{ tag: Tag }>(`/api/tags/${tagId}`, {
    method: "PATCH",
    body: input,
  });
  return tag;
}

export async function deleteTag(tagId: string): Promise<void> {
  await apiFetch(`/api/tags/${tagId}`, { method: "DELETE" });
}
