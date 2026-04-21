import "server-only";

import PocketBase from "pocketbase";
import { DomainError } from "./errors";

let cached: { pb: PocketBase; email: string; url: string } | null = null;
let pending: Promise<PocketBase> | null = null;

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readEnv() {
  return {
    url: process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090",
    publicUrl:
      process.env.NEXT_PUBLIC_POCKETBASE_URL ??
      process.env.POCKETBASE_URL ??
      "http://127.0.0.1:8090",
    email: normalizeEnvValue(process.env.POCKETBASE_SUPERUSER_EMAIL),
    password: normalizeEnvValue(process.env.POCKETBASE_SUPERUSER_PASSWORD),
  };
}

export function hasPbAdminCredentials() {
  const { email, password } = readEnv();
  return Boolean(email && password);
}

export async function getPbAdmin(): Promise<PocketBase> {
  const { url, email, password } = readEnv();
  if (
    cached &&
    cached.pb.authStore.isValid &&
    cached.url === url &&
    cached.email === email
  ) {
    return cached.pb;
  }
  if (pending) return pending;

  if (!email || !password) {
    throw new DomainError(
      "Server setup incomplete. Set POCKETBASE_SUPERUSER_EMAIL and POCKETBASE_SUPERUSER_PASSWORD, then restart the app.",
      503,
    );
  }

  pending = (async () => {
    const pb = new PocketBase(url);
    pb.autoCancellation(false);
    await pb.collection("_superusers").authWithPassword(email, password);
    cached = { pb, email, url };
    return pb;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

export function getPbUrl() {
  return readEnv().url;
}

/**
 * URL the browser uses to reach PocketBase directly (realtime subscriptions,
 * file downloads). Falls back to the internal url when unset. Server-to-server
 * PB API calls should keep using `getPbUrl()`.
 */
export function getPbPublicUrl() {
  return readEnv().publicUrl;
}
