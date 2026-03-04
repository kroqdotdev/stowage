import { describe, expect, it } from "vitest";
import {
  ensureFieldNotInUse,
  ensureSafeTypeChange,
  normalizeDropdownOptions,
  normalizeFieldOptions,
  requireAppDateFormat,
  requireCustomFieldName,
} from "../custom_fields_helpers";

describe("custom field helpers", () => {
  it("requires and normalizes field names", () => {
    expect(requireCustomFieldName("  Serial Number ")).toBe("Serial Number");
    expect(() => requireCustomFieldName("   ")).toThrowError(
      "Field name is required",
    );
  });

  it("normalizes dropdown options with trim and case-insensitive uniqueness", () => {
    expect(
      normalizeDropdownOptions([
        " In stock ",
        "in stock",
        "Needs Service",
        "  ",
        "needs service",
      ]),
    ).toEqual(["In stock", "Needs Service"]);
  });

  it("validates dropdown options by field type", () => {
    expect(normalizeFieldOptions("text", ["A", "B"])).toEqual([]);
    expect(
      normalizeFieldOptions("dropdown", [" High ", "high", "Low"]),
    ).toEqual(["High", "Low"]);
    expect(() => normalizeFieldOptions("dropdown", ["   "])).toThrowError(
      "Dropdown fields require at least one option",
    );
  });

  it("blocks unsafe type changes for fields with usage", () => {
    expect(() => ensureSafeTypeChange("number", "currency", 3)).not.toThrow();
    expect(() => ensureSafeTypeChange("text", "url", 1)).not.toThrow();
    expect(() => ensureSafeTypeChange("dropdown", "number", 2)).toThrowError(
      "Create a new field instead of changing to an incompatible type.",
    );
    expect(() => ensureSafeTypeChange("dropdown", "number", 0)).not.toThrow();
  });

  it("blocks deleting fields that are in use", () => {
    expect(() => ensureFieldNotInUse(0)).not.toThrow();
    expect(() => ensureFieldNotInUse(1)).toThrowError(
      "This field is in use and cannot be deleted",
    );
  });

  it("validates allowed app date formats", () => {
    expect(requireAppDateFormat("DD-MM-YYYY")).toBe("DD-MM-YYYY");
    expect(requireAppDateFormat("MM-DD-YYYY")).toBe("MM-DD-YYYY");
    expect(() => requireAppDateFormat("DD/MM/YYYY")).toThrowError(
      "Unsupported date format",
    );
  });
});
