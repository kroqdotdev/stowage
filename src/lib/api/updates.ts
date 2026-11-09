import { apiFetch } from "@/lib/api-client";

export type Release = {
  version: string;
  tag: string;
  name: string;
  publishedAt: number | null;
  url: string;
  notes: string;
  prerelease: boolean;
};

export type UpdaterStatus = {
  state: "idle" | "running" | "succeeded" | "failed";
  targetVersion: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  log: string[];
  error: string | null;
};

export type UpdaterView =
  | { configured: false; reason: "not-configured" }
  | { configured: true; reachable: false; reason: string }
  | { configured: true; reachable: true; status: UpdaterStatus };

export type UpdatesView = {
  repo: string;
  current: { version: string; build: string | null };
  latest: Release | null;
  newer: Release[];
  updateAvailable: boolean;
  checkedAt: number | null;
  checkError: string | null;
  checkWarning: string | null;
  updater: UpdaterView;
};

export async function getUpdates(options: { refresh?: boolean } = {}) {
  return apiFetch<UpdatesView>(
    options.refresh ? "/api/updates?refresh=1" : "/api/updates",
  );
}

export async function applyUpdate(version: string): Promise<UpdaterStatus> {
  const { status } = await apiFetch<{ status: UpdaterStatus }>(
    "/api/updates/apply",
    { method: "POST", body: { version } },
  );
  return status;
}

export type HealthView = { status: string; version: string | null };

/** Unauthenticated; used to notice the app coming back after an update. */
export async function getHealth(): Promise<HealthView> {
  const res = await fetch("/api/health", { cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return (await res.json()) as HealthView;
}
