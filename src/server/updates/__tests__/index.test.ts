import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DomainError } from "@/server/pb/errors";

import { applyUpdate, getUpdatesView } from "../index";
import { resetReleaseCache } from "../releases";

function gh(tag: string) {
  return {
    tag_name: tag,
    name: tag,
    body: "",
    html_url: `https://github.com/kroqdotdev/stowage/releases/tag/${tag}`,
    draft: false,
    prerelease: false,
    published_at: "2026-11-01T10:00:00Z",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("updates view", () => {
  const env = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetReleaseCache();
    process.env.NEXT_PUBLIC_APP_VERSION = "0.2.0";
    process.env.STOWAGE_BUILD_SHA = "abcdef1234567890";
    delete process.env.STOWAGE_UPDATER_URL;
    delete process.env.STOWAGE_UPDATER_TOKEN;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reports newer stable releases and the short build sha", async () => {
    fetchMock.mockResolvedValue(
      json([gh("v0.3.0"), gh("v0.2.0"), gh("v0.1.0")]),
    );
    const view = await getUpdatesView();
    expect(view.current).toEqual({ version: "0.2.0", build: "abcdef1" });
    expect(view.updateAvailable).toBe(true);
    expect(view.latest?.version).toBe("0.3.0");
    expect(view.newer.map((r) => r.version)).toEqual(["0.3.0"]);
    expect(view.checkError).toBeNull();
    expect(view.checkWarning).toBeNull();
    expect(view.updater).toEqual({
      configured: false,
      reason: "not-configured",
    });
  });

  it("reports a check error when GitHub is unreachable and nothing is cached", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const view = await getUpdatesView();
    expect(view.updateAvailable).toBe(false);
    expect(view.checkedAt).toBeNull();
    expect(view.checkError).toMatch(/Could not reach GitHub/);
  });

  it("warns when the list is stale because the refresh failed", async () => {
    fetchMock
      .mockResolvedValueOnce(json([gh("v0.3.0")]))
      .mockResolvedValueOnce(new Response("{}", { status: 403 }));
    const first = await getUpdatesView();
    expect(first.checkWarning).toBeNull();

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    const second = await getUpdatesView();
    expect(second.latest?.version).toBe("0.3.0");
    expect(second.checkError).toBeNull();
    expect(second.checkWarning).toMatch(/rate limit/i);
    expect(second.checkWarning).toMatch(/last successful check/);
  });

  it("refuses versions that are not newer published releases", async () => {
    fetchMock.mockResolvedValue(json([gh("v0.3.0"), gh("v0.2.0")]));
    await expect(applyUpdate("0.2.0")).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(
        /not a published release newer than 0\.2\.0/,
      ),
    });
    await expect(applyUpdate("9.9.9")).rejects.toBeInstanceOf(DomainError);
  });

  it("fails with 502 when GitHub cannot confirm the release", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(applyUpdate("0.3.0")).rejects.toMatchObject({ status: 502 });
  });

  it("maps updater errors to domain errors with their status", async () => {
    process.env.STOWAGE_UPDATER_URL = "http://updater:9876";
    process.env.STOWAGE_UPDATER_TOKEN = "secret";
    fetchMock.mockImplementation((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.github.com")) {
        return Promise.resolve(json([gh("v0.3.0")]));
      }
      if (url.endsWith("/update")) {
        return Promise.resolve(
          json({ error: "An update is already running" }, 409),
        );
      }
      return Promise.resolve(json({ state: "idle" }));
    });
    await expect(applyUpdate("0.3.0")).rejects.toMatchObject({
      status: 409,
      message: "An update is already running",
    });
  });
});
