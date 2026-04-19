import { describe, expect, it } from "vitest";

import {
  createFieldDefinition,
  deleteFieldDefinition,
  listFieldDefinitions,
  reorderFieldDefinitions,
  updateFieldDefinition,
  type FieldDefinitionView,
} from "@/server/domain/customFields";
import type { Ctx } from "@/server/pb/context";
import {
  ensureFieldNotInUse,
  ensureSafeTypeChange,
  normalizeDropdownOptions,
  normalizeFieldOptions,
  requireAppDateFormat,
  requireCustomFieldName,
} from "@/server/pb/custom-fields";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import { usePbHarness } from "@/test/pb-harness";

async function seedAdmin(pb: Ctx["pb"]) {
  return pb.collection("users").create({
    email: `admin-${Math.random().toString(36).slice(2)}@stowage.local`,
    password: "password123",
    passwordConfirm: "password123",
    role: "admin",
    createdAt: Date.now(),
  });
}

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

describe("customFields domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("creates definitions and lists them in sort order", async () => {
    await createFieldDefinition(ctx(), {
      name: "Serial number",
      fieldType: "text",
      options: [],
      required: true,
    });
    await createFieldDefinition(ctx(), {
      name: "Purchase date",
      fieldType: "date",
      options: [],
      required: false,
    });

    const rows = await listFieldDefinitions(ctx());
    expect(rows.map((row: FieldDefinitionView) => row.name)).toEqual([
      "Serial number",
      "Purchase date",
    ]);
    expect(rows.map((row: FieldDefinitionView) => row.sortOrder)).toEqual([
      0, 1,
    ]);
  });

  it("validates required dropdown options on create", async () => {
    await expect(
      createFieldDefinition(ctx(), {
        name: "Condition",
        fieldType: "dropdown",
        options: ["   "],
        required: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("reorders definitions by index", async () => {
    const first = await createFieldDefinition(ctx(), {
      name: "First",
      fieldType: "text",
      required: false,
    });
    const second = await createFieldDefinition(ctx(), {
      name: "Second",
      fieldType: "text",
      required: false,
    });
    const third = await createFieldDefinition(ctx(), {
      name: "Third",
      fieldType: "text",
      required: false,
    });

    await reorderFieldDefinitions(ctx(), [third.id, first.id, second.id]);

    const rows = await listFieldDefinitions(ctx());
    expect(rows.map((row: FieldDefinitionView) => row.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);
    expect(rows.map((row: FieldDefinitionView) => row.sortOrder)).toEqual([
      0, 1, 2,
    ]);
  });

  it("rejects reorder payloads with duplicate ids", async () => {
    const first = await createFieldDefinition(ctx(), {
      name: "First",
      fieldType: "text",
      required: false,
    });
    const second = await createFieldDefinition(ctx(), {
      name: "Second",
      fieldType: "text",
      required: false,
    });
    const third = await createFieldDefinition(ctx(), {
      name: "Third",
      fieldType: "text",
      required: false,
    });

    await expect(
      reorderFieldDefinitions(ctx(), [first.id, first.id, third.id]),
    ).rejects.toBeInstanceOf(ConflictError);

    const rows = await listFieldDefinitions(ctx());
    expect(rows.map((row) => row.id)).toEqual([first.id, second.id, third.id]);
  });

  it("blocks unsafe type changes when the field is in use", async () => {
    const pb = getHarness().admin;
    const created = await createFieldDefinition(ctx(), {
      name: "Condition",
      fieldType: "dropdown",
      options: ["New", "Used"],
      required: false,
    });
    await pb
      .collection("customFieldDefinitions")
      .update(created.id, { usageCount: 2 });

    await expect(
      updateFieldDefinition(ctx(), {
        fieldDefinitionId: created.id,
        name: "Condition",
        fieldType: "number",
        options: [],
        required: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("allows safe type changes even with usage (number ↔ currency)", async () => {
    const pb = getHarness().admin;
    const created = await createFieldDefinition(ctx(), {
      name: "Cost",
      fieldType: "number",
      required: false,
    });
    await pb
      .collection("customFieldDefinitions")
      .update(created.id, { usageCount: 5 });

    const updated = await updateFieldDefinition(ctx(), {
      fieldDefinitionId: created.id,
      name: "Cost",
      fieldType: "currency",
      options: [],
      required: false,
    });
    expect(updated.fieldType).toBe("currency");
  });

  it("blocks delete when usage count is positive", async () => {
    const pb = getHarness().admin;
    const created = await createFieldDefinition(ctx(), {
      name: "Condition",
      fieldType: "dropdown",
      options: ["New", "Used"],
      required: false,
    });
    await pb
      .collection("customFieldDefinitions")
      .update(created.id, { usageCount: 2 });

    await expect(
      deleteFieldDefinition(ctx(), created.id),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("blocks delete when a label template references the field", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const field = await createFieldDefinition(ctx(), {
      name: "QR payload",
      fieldType: "text",
      required: false,
    });

    await pb.collection("labelTemplates").create({
      name: "Asset tag label",
      normalizedName: "asset tag label",
      widthMm: 35,
      heightMm: 12,
      isDefault: false,
      elements: [
        {
          id: "custom-field",
          type: "customField",
          xMm: 2,
          yMm: 2,
          widthMm: 20,
          heightMm: 5,
          fontSize: 8,
          textAlign: "left",
          fieldId: field.id,
        },
      ],
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await expect(
      deleteFieldDefinition(ctx(), field.id),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("deletes an unused field definition", async () => {
    const field = await createFieldDefinition(ctx(), {
      name: "Temp",
      fieldType: "text",
      required: false,
    });
    await expect(deleteFieldDefinition(ctx(), field.id)).resolves.toBeUndefined();
    await expect(listFieldDefinitions(ctx())).resolves.toEqual([]);
  });

  it("throws NotFoundError when updating or deleting an unknown field", async () => {
    await expect(
      updateFieldDefinition(ctx(), {
        fieldDefinitionId: "nonexistent0000",
        name: "x",
        fieldType: "text",
        required: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      deleteFieldDefinition(ctx(), "nonexistent0000"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
