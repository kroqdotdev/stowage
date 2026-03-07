import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import {
  normalizeServiceName,
  normalizeServiceNameKey,
  normalizeOptionalServiceText,
  normalizeServiceFieldLabel,
  normalizeServiceFieldOptions,
  normalizeServiceFieldInput,
  normalizeServiceRecordValues,
} from "../service_record_helpers";

function expectConvexError(fn: () => unknown, code: string) {
  try {
    fn();
    expect.unreachable("Expected ConvexError");
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code);
  }
}

describe("normalizeServiceName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeServiceName("  Oil   Change  ")).toBe("Oil Change");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeServiceName("   ")).toBe("");
  });
});

describe("normalizeServiceNameKey", () => {
  it("lowercases the normalized name", () => {
    expect(normalizeServiceNameKey("Oil Change")).toBe("oil change");
  });
});

describe("normalizeOptionalServiceText", () => {
  it("returns null for empty or whitespace strings", () => {
    expect(normalizeOptionalServiceText("")).toBeNull();
    expect(normalizeOptionalServiceText("   ")).toBeNull();
    expect(normalizeOptionalServiceText(null)).toBeNull();
    expect(normalizeOptionalServiceText(undefined)).toBeNull();
  });

  it("trims non-empty strings", () => {
    expect(normalizeOptionalServiceText("  hello  ")).toBe("hello");
  });
});

describe("normalizeServiceFieldLabel", () => {
  it("normalizes non-empty labels", () => {
    expect(normalizeServiceFieldLabel("  Mileage  ")).toBe("Mileage");
  });

  it("throws on empty label", () => {
    expectConvexError(
      () => normalizeServiceFieldLabel("   "),
      "INVALID_FIELD_VALUE",
    );
  });
});

describe("normalizeServiceFieldOptions", () => {
  it("deduplicates case-insensitively keeping first occurrence", () => {
    const result = normalizeServiceFieldOptions(["Red", "red", "Blue"]);
    expect(result).toEqual(["Red", "Blue"]);
  });

  it("filters out blank options", () => {
    const result = normalizeServiceFieldOptions(["", "A", "   "]);
    expect(result).toEqual(["A"]);
  });
});

describe("normalizeServiceFieldInput", () => {
  it("returns empty options for non-select types", () => {
    const result = normalizeServiceFieldInput({
      label: "Notes",
      fieldType: "textarea",
      options: ["ignored"],
    });
    expect(result.label).toBe("Notes");
    expect(result.options).toEqual([]);
  });

  it("normalizes select field options", () => {
    const result = normalizeServiceFieldInput({
      label: "Priority",
      fieldType: "select",
      options: ["High", "  low  ", "high"],
    });
    expect(result.label).toBe("Priority");
    expect(result.options).toEqual(["High", "low"]);
  });

  it("throws when select has no valid options", () => {
    expectConvexError(
      () =>
        normalizeServiceFieldInput({
          label: "Status",
          fieldType: "select",
          options: ["", "   "],
        }),
      "INVALID_FIELD_VALUE",
    );
  });
});

describe("normalizeServiceRecordValues", () => {
  const textField = {
    _id: "f1",
    label: "Notes",
    fieldType: "text" as const,
    required: false,
    options: [],
  };

  const requiredTextField = {
    _id: "f2",
    label: "Description",
    fieldType: "text" as const,
    required: true,
    options: [],
  };

  const numberField = {
    _id: "f3",
    label: "Miles",
    fieldType: "number" as const,
    required: false,
    options: [],
  };

  const checkboxField = {
    _id: "f4",
    label: "Completed",
    fieldType: "checkbox" as const,
    required: false,
    options: [],
  };

  const selectField = {
    _id: "f5",
    label: "Priority",
    fieldType: "select" as const,
    required: false,
    options: ["High", "Low"],
  };

  const dateField = {
    _id: "f6",
    label: "Service Date",
    fieldType: "date" as const,
    required: false,
    options: [],
  };

  it("trims text values", () => {
    const result = normalizeServiceRecordValues({
      fields: [textField],
      values: { f1: "  hello  " },
    });
    expect(result.f1).toBe("hello");
  });

  it("omits empty optional fields", () => {
    const result = normalizeServiceRecordValues({
      fields: [textField],
      values: { f1: "" },
    });
    expect(result).not.toHaveProperty("f1");
  });

  it("throws on missing required text field", () => {
    expectConvexError(
      () =>
        normalizeServiceRecordValues({
          fields: [requiredTextField],
          values: { f2: "" },
        }),
      "MISSING_REQUIRED_FIELD",
    );
  });

  it("validates number fields", () => {
    const result = normalizeServiceRecordValues({
      fields: [numberField],
      values: { f3: 42 },
    });
    expect(result.f3).toBe(42);
  });

  it("rejects non-number for number fields", () => {
    expectConvexError(
      () =>
        normalizeServiceRecordValues({
          fields: [numberField],
          values: { f3: "not a number" as unknown as number },
        }),
      "INVALID_FIELD_VALUE",
    );
  });

  it("preserves boolean checkbox values", () => {
    const result = normalizeServiceRecordValues({
      fields: [checkboxField],
      values: { f4: true },
    });
    expect(result.f4).toBe(true);
  });

  it("validates select options", () => {
    const result = normalizeServiceRecordValues({
      fields: [selectField],
      values: { f5: "High" },
    });
    expect(result.f5).toBe("High");
  });

  it("rejects invalid select option", () => {
    expectConvexError(
      () =>
        normalizeServiceRecordValues({
          fields: [selectField],
          values: { f5: "Medium" },
        }),
      "INVALID_FIELD_VALUE",
    );
  });

  it("validates date fields via requireIsoDate", () => {
    const result = normalizeServiceRecordValues({
      fields: [dateField],
      values: { f6: "2026-03-15" },
    });
    expect(result.f6).toBe("2026-03-15");
  });

  it("throws on unknown field keys", () => {
    expectConvexError(
      () =>
        normalizeServiceRecordValues({
          fields: [textField],
          values: { unknown_id: "value" },
        }),
      "FIELD_NOT_FOUND",
    );
  });
});
