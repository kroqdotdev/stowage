import "server-only";

/*
  Talks to the updater sidecar (deploy/updater/server.mjs) when the release
  compose project runs it. Without STOWAGE_UPDATER_URL and a token the app
  only reports what is available and leaves the update to the operator.
*/

export type UpdaterState = "idle" | "running" | "succeeded" | "failed";

export type UpdaterStatus = {
  state: UpdaterState;
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

export class UpdaterError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UpdaterError";
  }
}

function config() {
  const url = process.env.STOWAGE_UPDATER_URL?.trim();
  const token = process.env.STOWAGE_UPDATER_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function isUpdaterConfigured() {
  return config() !== null;
}

function normalizeStatus(raw: unknown): UpdaterStatus {
  const data = (raw ?? {}) as Partial<UpdaterStatus>;
  const state: UpdaterState =
    data.state === "running" ||
    data.state === "succeeded" ||
    data.state === "failed"
      ? data.state
      : "idle";
  return {
    state,
    targetVersion: data.targetVersion ?? null,
    startedAt: data.startedAt ?? null,
    finishedAt: data.finishedAt ?? null,
    log: Array.isArray(data.log) ? data.log.map(String) : [],
    error: data.error ?? null,
  };
}

async function call(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const cfg = config();
  if (!cfg) throw new UpdaterError("Updater is not configured", 501);
  let res: Response;
  try {
    res = await fetchImpl(`${cfg.url}${path}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${cfg.token}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
  } catch {
    throw new UpdaterError("Updater is not reachable", 502);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new UpdaterError(
      data.error ?? `Updater answered ${res.status}`,
      res.status === 401 ? 502 : res.status,
    );
  }
  return data;
}

export async function getUpdaterView(
  fetchImpl: typeof fetch = fetch,
): Promise<UpdaterView> {
  if (!config()) return { configured: false, reason: "not-configured" };
  try {
    const status = normalizeStatus(await call("/status", {}, fetchImpl));
    return { configured: true, reachable: true, status };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      reason:
        error instanceof UpdaterError && error.status === 502
          ? error.message === "Updater is not reachable"
            ? "The updater service is not running or not reachable from the app."
            : "The updater rejected the app's token. Set the same STOWAGE_UPDATER_TOKEN for both services."
          : "The updater returned an error.",
    };
  }
}

export async function requestUpdate(
  version: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UpdaterStatus> {
  const data = await call(
    "/update",
    { method: "POST", body: { version } },
    fetchImpl,
  );
  return normalizeStatus(data);
}
