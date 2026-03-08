import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStorageLimitBytes } from "../storage_quota";

describe("getStorageLimitBytes", () => {
  let originalValue: string | undefined;

  beforeEach(() => {
    originalValue = process.env.STORAGE_LIMIT_GB;
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.STORAGE_LIMIT_GB;
      return;
    }

    process.env.STORAGE_LIMIT_GB = originalValue;
  });

  it("returns null when env var is not set", () => {
    delete process.env.STORAGE_LIMIT_GB;
    expect(getStorageLimitBytes()).toBeNull();
  });

  it("returns null when env var is empty", () => {
    process.env.STORAGE_LIMIT_GB = "";
    expect(getStorageLimitBytes()).toBeNull();
  });

  it("returns null when env var is whitespace", () => {
    process.env.STORAGE_LIMIT_GB = "   ";
    expect(getStorageLimitBytes()).toBeNull();
  });

  it("returns null for non-numeric values", () => {
    process.env.STORAGE_LIMIT_GB = "abc";
    expect(getStorageLimitBytes()).toBeNull();
  });

  it("returns null for zero", () => {
    process.env.STORAGE_LIMIT_GB = "0";
    expect(getStorageLimitBytes()).toBeNull();
  });

  it("returns null for negative values", () => {
    process.env.STORAGE_LIMIT_GB = "-5";
    expect(getStorageLimitBytes()).toBeNull();
  });

  it("converts whole GB to bytes", () => {
    process.env.STORAGE_LIMIT_GB = "15";
    expect(getStorageLimitBytes()).toBe(15 * 1024 * 1024 * 1024);
  });

  it("converts fractional GB to bytes", () => {
    process.env.STORAGE_LIMIT_GB = "0.5";
    expect(getStorageLimitBytes()).toBe(Math.round(0.5 * 1024 * 1024 * 1024));
  });

  it("handles small decimal values", () => {
    process.env.STORAGE_LIMIT_GB = "0.001";
    const result = getStorageLimitBytes();
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(Math.round(0.001 * 1024 * 1024 * 1024));
  });
});
