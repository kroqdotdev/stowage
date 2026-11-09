import "server-only";

import { DomainError } from "@/server/pb/errors";

import {
  RELEASE_REPO,
  ReleaseFetchError,
  getReleases,
  selectNewer,
  type Release,
} from "./releases";
import {
  UpdaterError,
  getUpdaterView,
  requestUpdate,
  type UpdaterView,
} from "./updater-client";

export type UpdatesView = {
  repo: string;
  current: { version: string; build: string | null };
  latest: Release | null;
  newer: Release[];
  updateAvailable: boolean;
  checkedAt: number | null;
  checkError: string | null;
  updater: UpdaterView;
};

export function currentVersion() {
  return process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "0.0.0";
}

export function currentBuild() {
  const sha = process.env.STOWAGE_BUILD_SHA?.trim();
  return sha ? sha.slice(0, 7) : null;
}

export async function getUpdatesView(
  options: {
    refresh?: boolean;
  } = {},
): Promise<UpdatesView> {
  const current = currentVersion();
  const [releaseResult, updater] = await Promise.all([
    getReleases({ refresh: options.refresh }).then(
      (result) => ({ ok: true as const, ...result }),
      (error: unknown) => ({
        ok: false as const,
        error:
          error instanceof ReleaseFetchError
            ? error.message
            : "Could not reach GitHub to check for updates.",
      }),
    ),
    getUpdaterView(),
  ]);

  const newer = releaseResult.ok
    ? selectNewer(releaseResult.releases, current)
    : [];
  return {
    repo: RELEASE_REPO,
    current: { version: current, build: currentBuild() },
    latest: newer[0] ?? null,
    newer,
    updateAvailable: newer.length > 0,
    checkedAt: releaseResult.ok ? releaseResult.fetchedAt : null,
    checkError: releaseResult.ok ? null : releaseResult.error,
    updater,
  };
}

export async function applyUpdate(version: string) {
  const current = currentVersion();
  let releases: Release[];
  try {
    releases = (await getReleases()).releases;
  } catch {
    throw new DomainError(
      "Could not reach GitHub to confirm the release before updating.",
      502,
    );
  }
  const target = selectNewer(releases, current).find(
    (release) => release.version === version,
  );
  if (!target) {
    throw new DomainError(
      `${version} is not a published release newer than ${current}.`,
      400,
    );
  }
  try {
    return await requestUpdate(target.version);
  } catch (error) {
    if (error instanceof UpdaterError) {
      throw new DomainError(error.message, error.status);
    }
    throw error;
  }
}
