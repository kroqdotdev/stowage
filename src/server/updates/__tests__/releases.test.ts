import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ReleaseFetchError,
  fetchReleasesFromGitHub,
  getReleases,
  resetReleaseCache,
  selectNewer,
  toRelease,
  type Release,
} from "../releases";

function gh(tag: string, extra: Record<string, unknown> = {}) {
  return {
    tag_name: tag,
    name: `Stowage ${tag}`,
    body: "## Added\n\n- Things",
    html_url: `https://github.com/kroqdotdev/stowage/releases/tag/${tag}`,
    draft: false,
    prerelease: false,
    published_at: "2026-11-01T10:00:00Z",
    ...extra,
  };
}

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("releases", () => {
  beforeEach(() => resetReleaseCache());
  afterEach(() => vi.restoreAllMocks());

  it("maps GitHub releases and drops drafts and odd tags", () => {
    expect(toRelease(gh("v0.3.0"))).toMatchObject({
      version: "0.3.0",
      tag: "v0.3.0",
      name: "Stowage v0.3.0",
      prerelease: false,
      publishedAt: Date.parse("2026-11-01T10:00:00Z"),
    });
    expect(toRelease(gh("v0.3.0", { draft: true }))).toBeNull();
    expect(toRelease(gh("nightly"))).toBeNull();
    expect(toRelease(gh("v0.4.0-rc.1"))?.prerelease).toBe(true);
    expect(toRelease(gh("v0.4.0", { prerelease: true }))?.prerelease).toBe(
      true,
    );
    expect(toRelease(gh("v0.3.0", { name: "  ", body: null }))).toMatchObject({
      name: "v0.3.0",
      notes: "",
    });
  });

  it("selects only stable releases newer than the current one, newest first", () => {
    const releases = [
      gh("v0.1.0"),
      gh("v0.2.0"),
      gh("v0.2.1"),
      gh("v0.3.0-rc.1"),
      gh("v0.10.0"),
    ]
      .map(toRelease)
      .filter((r): r is Release => r !== null);

    expect(selectNewer(releases, "0.2.0").map((r) => r.version)).toEqual([
      "0.10.0",
      "0.2.1",
    ]);
    expect(selectNewer(releases, "0.10.0")).toEqual([]);
  });

  it("lets a prerelease build see newer prereleases too", () => {
    const releases = [gh("v0.3.0-rc.1"), gh("v0.3.0-rc.2"), gh("v0.2.1")]
      .map(toRelease)
      .filter((r): r is Release => r !== null);
    expect(selectNewer(releases, "0.3.0-rc.1").map((r) => r.version)).toEqual([
      "0.3.0-rc.2",
    ]);
  });

  it("fetches with GitHub headers and turns rate limits into a clear error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse([gh("v0.3.0")]));
    const releases = await fetchReleasesFromGitHub(
      fetchImpl as unknown as typeof fetch,
    );
    expect(releases).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/repos/kroqdotdev/stowage/releases");
    expect((init.headers as Record<string, string>)["user-agent"]).toBe(
      "stowage-update-check",
    );

    const limited = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 403 }));
    await expect(
      fetchReleasesFromGitHub(limited as unknown as typeof fetch),
    ).rejects.toThrow(ReleaseFetchError);
    await expect(
      fetchReleasesFromGitHub(limited as unknown as typeof fetch),
    ).rejects.toThrow(/rate limit/i);
  });

  it("caches for an hour, refreshes at most once a minute, and serves stale on failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse([gh("v0.3.0")]))
      .mockResolvedValueOnce(okResponse([gh("v0.3.0"), gh("v0.3.1")]))
      .mockRejectedValueOnce(new Error("offline"));
    const t0 = Date.parse("2026-11-09T12:00:00Z");

    const first = await getReleases({ fetchImpl, now: t0 });
    expect(first.releases).toHaveLength(1);

    // Within the TTL and without refresh: cached.
    const second = await getReleases({ fetchImpl, now: t0 + 10 * 60_000 });
    expect(second.releases).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Refresh too soon after the last fetch: still cached.
    await getReleases({ fetchImpl, now: t0 + 30_000, refresh: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Refresh after a minute: fetched again.
    const third = await getReleases({
      fetchImpl,
      now: t0 + 2 * 60_000,
      refresh: true,
    });
    expect(third.releases).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    // Expired and GitHub down: the stale list is returned.
    const fourth = await getReleases({ fetchImpl, now: t0 + 3 * 3_600_000 });
    expect(fourth.releases).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws when there is no cache and GitHub is unreachable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(getReleases({ fetchImpl })).rejects.toThrow("offline");
  });
});
