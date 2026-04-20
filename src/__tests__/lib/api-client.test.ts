import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError, apiFetch } from "@/lib/api-client";

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns parsed JSON on 2xx", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ hello: "world" }), { status: 200 }),
    );
    const result = await apiFetch<{ hello: string }>("/api/test");
    expect(result).toEqual({ hello: "world" });
  });

  it("returns undefined for 204 No Content", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const result = await apiFetch<void>("/api/test");
    expect(result).toBeUndefined();
  });

  it("throws ApiRequestError with error message and status for 4xx", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 }),
    );
    await expect(apiFetch("/api/test")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 400,
      message: "Invalid input",
    });
  });

  it("preserves zod issues on the error", async () => {
    const issues = [{ path: ["email"], message: "Required" }];
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid request", issues }), {
        status: 400,
      }),
    );
    try {
      await apiFetch("/api/test");
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      if (error instanceof ApiRequestError) {
        expect(error.issues).toEqual(issues);
      }
    }
  });

  it("falls back to statusText on non-JSON error bodies", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("Internal Server Error", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );
    await expect(apiFetch("/api/test")).rejects.toMatchObject({
      status: 500,
      message: "Internal Server Error",
    });
  });

  it("sends JSON bodies with content-type header", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await apiFetch("/api/test", { method: "POST", body: { hello: 1 } });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ hello: 1 }),
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("sends FormData without setting content-type", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const fd = new FormData();
    fd.append("key", "value");
    await apiFetch("/api/test", { method: "POST", body: fd });
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(call?.[1]?.body).toBe(fd);
    expect(call?.[1]?.headers).toBeUndefined();
  });
});
