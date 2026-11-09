import { describe, expect, it } from "vitest";

import {
  compareVersions,
  isNewerVersion,
  isPrereleaseVersion,
  parseVersion,
} from "../semver";

describe("semver", () => {
  it("parses release and prerelease versions, with or without a v", () => {
    expect(parseVersion("v0.2.0")).toEqual({
      major: 0,
      minor: 2,
      patch: 0,
      prerelease: [],
    });
    expect(parseVersion("1.4.2-rc.1+build.5")?.prerelease).toEqual(["rc", "1"]);
    expect(parseVersion("1.2")).toBeNull();
    expect(parseVersion("latest")).toBeNull();
  });

  it("orders versions numerically, not lexically", () => {
    expect(isNewerVersion("0.10.0", "0.9.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.99.99")).toBe(true);
    expect(isNewerVersion("0.2.0", "0.2.0")).toBe(false);
    expect(isNewerVersion("0.2.0", "0.2.1")).toBe(false);
  });

  it("ranks a release above its prereleases and orders prereleases", () => {
    expect(isNewerVersion("0.3.0", "0.3.0-rc.2")).toBe(true);
    expect(isNewerVersion("0.3.0-rc.2", "0.3.0-rc.1")).toBe(true);
    expect(isNewerVersion("0.3.0-rc.10", "0.3.0-rc.9")).toBe(true);
    expect(isNewerVersion("0.3.0-beta", "0.3.0-alpha")).toBe(true);
    expect(isNewerVersion("0.3.0-rc.1", "0.3.0")).toBe(false);
    const a = parseVersion("1.0.0-alpha")!;
    const b = parseVersion("1.0.0-alpha.1")!;
    expect(compareVersions(a, b)).toBeLessThan(0);
  });

  it("treats unparsable input as not newer", () => {
    expect(isNewerVersion("abc", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.2.0", "")).toBe(false);
    expect(isPrereleaseVersion("0.3.0-rc.1")).toBe(true);
    expect(isPrereleaseVersion("0.3.0")).toBe(false);
  });
});
