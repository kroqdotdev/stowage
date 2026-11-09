/*
  Just enough semver for release versions: MAJOR.MINOR.PATCH with an optional
  prerelease suffix. Build metadata is ignored.
*/
export type SemVer = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

const RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseVersion(input: string): SemVer | null {
  const match = RE.exec(input.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareIdentifiers(a: string, b: string) {
  const aNum = /^\d+$/.test(a);
  const bNum = /^\d+$/.test(b);
  if (aNum && bNum) return Math.sign(Number(a) - Number(b));
  if (aNum) return -1; // numeric identifiers sort before alphanumeric
  if (bNum) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Negative when a < b, zero when equal, positive when a > b. */
export function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return Math.sign(a.major - b.major);
  if (a.minor !== b.minor) return Math.sign(a.minor - b.minor);
  if (a.patch !== b.patch) return Math.sign(a.patch - b.patch);
  // A release outranks any of its prereleases.
  if (!a.prerelease.length && b.prerelease.length) return 1;
  if (a.prerelease.length && !b.prerelease.length) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i += 1) {
    const left = a.prerelease[i];
    const right = b.prerelease[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const result = compareIdentifiers(left, right);
    if (result !== 0) return result;
  }
  return 0;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  return compareVersions(a, b) > 0;
}

export function isPrereleaseVersion(version: string): boolean {
  return (parseVersion(version)?.prerelease.length ?? 0) > 0;
}
