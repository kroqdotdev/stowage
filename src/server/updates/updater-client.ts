import "server-only";

import { z } from "zod";

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

const StatusSchema = z.object({
  state: z.enum(["idle", "running", "succeeded", "failed"]).catch("idle"),
  targetVersion: z.string().nullable().catch(null),
  startedAt: z.number().nullable().catch(null),
  finishedAt: z.number().nullable().catch(null),
  log: z.array(z.unknown()).catch([]),
  error: z.string().nullable().catch(null),
});

export function normalizeStatus(raw: unknown): UpdaterStatus {
  const parsed = StatusSchema.safeParse(raw ?? {});
  const data = parsed.success ? parsed.data : StatusSchema.parse({});
  return { ...data, log: data.log.map(String) };
}

const TOKEN_REJECTED =
  "The updater rejected the app's token. Set the same STOWAGE_UPDATER_TOKEN for both services.";
const NOT_REACHABLE = "Updater is not reachable";

async function call(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; timeoutMs?: number } = {},
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
      signal: AbortSignal.timeout(init.timeoutMs ?? 4000),
      cache: "no-store",
    });
  } catch {
    throw new UpdaterError(NOT_REACHABLE, 502);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) throw new UpdaterError(TOKEN_REJECTED, 502);
  if (!res.ok) {
    throw new UpdaterError(
      data.error ?? `Updater answered ${res.status}`,
      res.status,
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
        error instanceof UpdaterError && error.message === NOT_REACHABLE
          ? "The updater service is not running or not reachable from the app."
          : error instanceof UpdaterError
            ? error.message
            : "The updater returned an error.",
    };
  }
}

export async function requestUpdate(
  version: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UpdaterStatus> {
  // Starting an update means inspecting containers and creating the helper;
  // give a slow host time to answer so the UI follows the run it started.
  const data = await call(
    "/update",
    { method: "POST", body: { version }, timeoutMs: 30_000 },
    fetchImpl,
  );
  return normalizeStatus(data);
}
