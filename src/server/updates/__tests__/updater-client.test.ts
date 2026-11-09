import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getUpdaterView,
  isUpdaterConfigured,
  requestUpdate,
} from "../updater-client";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("updater client", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.STOWAGE_UPDATER_URL = "http://updater:9876/";
    process.env.STOWAGE_UPDATER_TOKEN = "secret";
  });

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("reports not configured without a URL and token", async () => {
    delete process.env.STOWAGE_UPDATER_TOKEN;
    expect(isUpdaterConfigured()).toBe(false);
    expect(await getUpdaterView()).toEqual({
      configured: false,
      reason: "not-configured",
    });
  });

  it("reads status with the bearer token and normalises unknown states", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({
        state: "weird",
        log: ["a", 2],
        targetVersion: "0.3.0",
        startedAt: "soon",
        error: { nested: true },
      }),
    );
    const view = await getUpdaterView(fetchImpl as unknown as typeof fetch);
    expect(view).toEqual({
      configured: true,
      reachable: true,
      status: {
        state: "idle",
        targetVersion: "0.3.0",
        startedAt: null,
        finishedAt: null,
        log: ["a", "2"],
        error: null,
      },
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://updater:9876/status");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer secret",
    );
  });

  it("explains an unreachable updater and a rejected token", async () => {
    const down = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await getUpdaterView(down as unknown as typeof fetch)).toMatchObject(
      {
        configured: true,
        reachable: false,
        reason: expect.stringMatching(/not running or not reachable/),
      },
    );

    const unauthorized = vi
      .fn()
      .mockResolvedValue(json({ error: "Unauthorized" }, 401));
    expect(
      await getUpdaterView(unauthorized as unknown as typeof fetch),
    ).toMatchObject({
      reachable: false,
      reason: expect.stringMatching(/STOWAGE_UPDATER_TOKEN/),
    });
  });

  it("posts the version and surfaces updater errors with their status", async () => {
    const accepted = vi
      .fn()
      .mockResolvedValue(
        json({ state: "running", targetVersion: "0.3.0", log: ["go"] }, 202),
      );
    const status = await requestUpdate(
      "0.3.0",
      accepted as unknown as typeof fetch,
    );
    expect(status.state).toBe("running");
    const [, init] = accepted.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ version: "0.3.0" });

    const busy = vi
      .fn()
      .mockResolvedValue(json({ error: "An update is already running" }, 409));
    await expect(
      requestUpdate("0.3.0", busy as unknown as typeof fetch),
    ).rejects.toMatchObject({
      status: 409,
      message: "An update is already running",
    });
  });
});
