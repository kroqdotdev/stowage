import { apiFetch } from "@/lib/api-client";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdBy: string | null;
  createdAt: number;
};

export async function listUsers(): Promise<User[]> {
  const { users } = await apiFetch<{ users: User[] }>("/api/users");
  return users;
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: "admin" | "user";
}): Promise<User> {
  const { user } = await apiFetch<{ user: User }>("/api/users", {
    method: "POST",
    body: input,
  });
  return user;
}

export async function updateUserRole(
  userId: string,
  role: "admin" | "user",
): Promise<User> {
  const { user } = await apiFetch<{ user: User }>(`/api/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });
  return user;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch("/api/users/me/password", {
    method: "POST",
    body: input,
  });
}
