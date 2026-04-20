import "server-only";

import PocketBase from "pocketbase";

let cached: { pb: PocketBase; email: string; url: string } | null = null;
let pending: Promise<PocketBase> | null = null;

function readEnv() {
  return {
    url: process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090",
    publicUrl:
      process.env.NEXT_PUBLIC_POCKETBASE_URL ??
      process.env.POCKETBASE_URL ??
      "http://127.0.0.1:8090",
    email: process.env.POCKETBASE_SUPERUSER_EMAIL,
    password: process.env.POCKETBASE_SUPERUSER_PASSWORD,
  };
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
    throw new Error(
      "POCKETBASE_SUPERUSER_EMAIL and POCKETBASE_SUPERUSER_PASSWORD must be set",
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
