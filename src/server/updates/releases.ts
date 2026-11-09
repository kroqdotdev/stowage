import "server-only";

import { isNewerVersion, isPrereleaseVersion, parseVersion } from "./semver";

/*
  Published releases come from the GitHub Releases API of the repo the images
  are built from. Results are cached in memory for an hour; `refresh` forces a
  new request, no more than once a minute (the unauthenticated limit is 60
  requests an hour per address).
*/

export const RELEASE_REPO =
  process.env.STOWAGE_RELEASE_REPO?.trim() || "kroqdotdev/stowage";

export type Release = {
  version: string;
  tag: string;
  name: string;
  publishedAt: number | null;
  url: string;
  notes: string;
  prerelease: boolean;
};

type GitHubRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
};

type Cache = {
  releases: Release[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const REFRESH_MIN_INTERVAL_MS = 60 * 1000;
const PER_PAGE = 30;

let cache: Cache | null = null;
let inflight: Promise<Release[]> | null = null;

export class ReleaseFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseFetchError";
  }
}

export function toRelease(raw: GitHubRelease): Release | null {
  if (raw.draft) return null;
  const parsed = parseVersion(raw.tag_name);
  if (!parsed) return null;
  const version = raw.tag_name.replace(/^v/, "");
  return {
    version,
    tag: raw.tag_name,
    name: raw.name?.trim() || raw.tag_name,
    publishedAt: raw.published_at ? Date.parse(raw.published_at) : null,
    url: raw.html_url,
    notes: raw.body?.trim() ?? "",
    prerelease: raw.prerelease || isPrereleaseVersion(version),
  };
}

export async function fetchReleasesFromGitHub(
  fetchImpl: typeof fetch = fetch,
): Promise<Release[]> {
  const res = await fetchImpl(
    `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=${PER_PAGE}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "stowage-update-check",
        "x-github-api-version": "2022-11-28",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new ReleaseFetchError(
      res.status === 403 || res.status === 429
        ? "GitHub rate limit reached. Try again in a few minutes."
        : `GitHub answered ${res.status} when listing releases.`,
    );
  }
  const data = (await res.json()) as GitHubRelease[];
  return data
    .map(toRelease)
    .filter((release): release is Release => release !== null);
}

export async function getReleases(
  options: {
    refresh?: boolean;
    now?: number;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ releases: Release[]; fetchedAt: number }> {
  const now = options.now ?? Date.now();
  if (cache) {
    const age = now - cache.fetchedAt;
    const fresh = age < CACHE_TTL_MS;
    const refreshable = age >= REFRESH_MIN_INTERVAL_MS;
    if (fresh && !(options.refresh && refreshable)) return cache;
  }
  if (!inflight) {
    inflight = fetchReleasesFromGitHub(options.fetchImpl).finally(() => {
      inflight = null;
    });
  }
  try {
    const releases = await inflight;
    cache = { releases, fetchedAt: now };
    return cache;
  } catch (error) {
    // Stale is better than nothing when GitHub is unreachable.
    if (cache) return cache;
    throw error;
  }
}

export function resetReleaseCache() {
  cache = null;
  inflight = null;
}

/**
 * Stable releases newer than `current`, newest first. A prerelease build only
 * sees prereleases ahead of it too, so an rc can move to the next rc.
 */
export function selectNewer(releases: Release[], current: string): Release[] {
  const onPrerelease = isPrereleaseVersion(current);
  return releases
    .filter((release) => onPrerelease || !release.prerelease)
    .filter((release) => isNewerVersion(release.version, current))
    .sort((a, b) => (isNewerVersion(a.version, b.version) ? -1 : 1));
}
