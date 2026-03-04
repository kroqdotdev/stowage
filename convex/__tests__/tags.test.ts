import { describe, expect, it } from "vitest";
import {
  normalizeCatalogNameKey,
  normalizeHexColor,
  requireCatalogName,
} from "../catalog_helpers";

describe("tag helpers", () => {
  it("builds a stable duplicate-check key for tag names", () => {
    const a = normalizeCatalogNameKey("  Fragile  ");
    const b = normalizeCatalogNameKey("fragile");
    const c = normalizeCatalogNameKey("FRAGILE");

    expect(a).toBe("fragile");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("validates tag names", () => {
    expect(requireCatalogName("Urgent")).toBe("Urgent");
    expect(() => requireCatalogName("")).toThrowError("Name is required");
  });

  it("normalizes tag colors", () => {
    expect(normalizeHexColor("#e11d48")).toBe("#E11D48");
    expect(() => normalizeHexColor("#12")).toThrowError(
      "Enter a valid hex color",
    );
  });
});
