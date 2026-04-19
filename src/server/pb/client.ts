import "server-only";

import PocketBase from "pocketbase";

const url = process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090";
const email = process.env.POCKETBASE_SUPERUSER_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD;

let cached: PocketBase | null = null;
let pending: Promise<PocketBase> | null = null;

export async function getPbAdmin(): Promise<PocketBase> {
  if (cached && cached.authStore.isValid) return cached;
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
    cached = pb;
    return pb;
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

export function getPbUrl() {
  return url;
}
