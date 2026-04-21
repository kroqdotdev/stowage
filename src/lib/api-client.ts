export type ApiError = {
  error: string;
  status: number;
  issues?: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly issues?: unknown;

  constructor(error: ApiError) {
    super(error.error);
    this.name = "ApiRequestError";
    this.status = error.status;
    this.issues = error.issues;
  }
}

async function readError(res: Response): Promise<ApiError> {
  let message = res.statusText || "Request failed";
  let issues: unknown;
  try {
    const body = (await res.json()) as {
      error?: string;
      issues?: unknown;
    };
    if (body?.error) message = body.error;
    if (body?.issues !== undefined) issues = body.issues;
  } catch {
    // ignore non-JSON error bodies
  }
  return { error: message, status: res.status, issues };
}

type JsonBody = Record<string, unknown> | unknown[];

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: JsonBody | FormData;
  signal?: AbortSignal;
};

/**
 * Small fetch wrapper for our /api/** routes. Sends credentials, parses JSON
 * responses, and throws ApiRequestError (preserving status + issues) on non-OK.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = "GET", body, signal } = options;

  const init: RequestInit = {
    method,
    credentials: "include",
    signal,
  };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }

  const res = await fetch(path, init);

  if (!res.ok) {
    throw new ApiRequestError(await readError(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
