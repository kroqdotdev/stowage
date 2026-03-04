import { describe, expect, it } from "vitest";
import {
  normalizeCatalogNameKey,
  normalizeHexColor,
  normalizeOptionalText,
  normalizePrefix,
  requireCatalogName,
} from "../catalog_helpers";

describe("category helpers", () => {
  it("requires and normalizes category names", () => {
    expect(requireCatalogName("  Laptop Computers  ")).toBe("Laptop Computers");
    expect(normalizeCatalogNameKey("  Laptop Computers  ")).toBe(
      "laptop computers",
    );
    expect(() => requireCatalogName("   ")).toThrowError("Name is required");
  });

  it("normalizes optional prefix and description fields", () => {
    expect(normalizePrefix("  LAP  ")).toBe("LAP");
    expect(normalizePrefix("   ")).toBeNull();
    expect(normalizeOptionalText("  End user devices  ")).toBe(
      "End user devices",
    );
    expect(normalizeOptionalText(undefined)).toBeNull();
  });

  it("normalizes hex colors to uppercase 6-digit values", () => {
    expect(normalizeHexColor("#2563eb")).toBe("#2563EB");
    expect(normalizeHexColor("2563eb")).toBe("#2563EB");
    expect(normalizeHexColor("#abc")).toBe("#AABBCC");
    expect(() => normalizeHexColor("blue")).toThrowError(
      "Enter a valid hex color",
    );
  });
});
