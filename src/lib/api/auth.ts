import { apiFetch } from "@/lib/api-client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
};

export type AuthBootstrapState = {
  firstRun: boolean;
  adminConfigReady: boolean;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { user } = await apiFetch<{ user: SessionUser | null }>("/api/auth/me");
  return user;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<SessionUser> {
  const { user } = await apiFetch<{ user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: { email: input.email, password: input.password },
  });
  return user;
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}

export async function checkFirstRun(): Promise<AuthBootstrapState> {
  return await apiFetch<AuthBootstrapState>(
    "/api/auth/first-run",
  );
}

export async function createFirstAdmin(input: {
  email: string;
  name: string;
  password: string;
}): Promise<SessionUser> {
  const { user } = await apiFetch<{ user: SessionUser }>(
    "/api/auth/first-admin",
    {
      method: "POST",
      body: input,
    },
  );
  return user;
}
