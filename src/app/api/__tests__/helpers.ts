import PocketBase from "pocketbase";
import { NextRequest } from "next/server";

import type { PbHarness } from "@/test/pb-harness";

export async function seedUser(
  harness: PbHarness,
  role: "admin" | "user" = "admin",
) {
  const email = `user-${Math.random().toString(36).slice(2)}@stowage.local`;
  const password = "password123";
  const record = await harness.admin.collection("users").create({
    email,
    password,
    passwordConfirm: password,
    name: `Test ${role}`,
    role,
    createdAt: Date.now(),
  });
  const client = new PocketBase(harness.url);
  client.autoCancellation(false);
  const auth = await client
    .collection("users")
    .authWithPassword(email, password);
  return { id: record.id, email, password, token: auth.token };
}

export function makeRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    json?: unknown;
    body?: BodyInit;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const headers = new Headers(options.headers);
  if (options.token) headers.set("cookie", `pb_auth=${options.token}`);

  let body: BodyInit | undefined = options.body;
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    headers.set("content-type", "application/json");
  }

  return new NextRequest(url, {
    method: options.method ?? "GET",
    headers,
    body,
  });
}

export async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
