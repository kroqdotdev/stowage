import { beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function insertUser(
  t: ReturnType<typeof convexTest>,
  role: "admin" | "user",
): Promise<Id<"users">> {
  return (await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: role === "admin" ? "Admin User" : "Standard User",
      email: `${role}-${Math.random().toString(36).slice(2)}@example.com`,
      role,
      createdBy: null,
      createdAt: Date.now(),
    }),
  )) as Id<"users">;
}

function asUser(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

describe("customFields functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
  });

  it("creates and lists definitions in sort order", async () => {
    const admin = asUser(t, adminId);

    await admin.mutation(api.customFields.createFieldDefinition, {
      name: "Serial number",
      fieldType: "text",
      options: [],
      required: true,
    });
    await admin.mutation(api.customFields.createFieldDefinition, {
      name: "Purchase date",
      fieldType: "date",
      options: [],
      required: false,
    });

    const rows = await admin.query(api.customFields.listFieldDefinitions, {});
    expect(rows.map((row) => row.name)).toEqual([
      "Serial number",
      "Purchase date",
    ]);
    expect(rows.map((row) => row.sortOrder)).toEqual([0, 1]);
  });

  it("rejects create for non-admin users", async () => {
    const member = asUser(t, userId);
    await expect(
      member.mutation(api.customFields.createFieldDefinition, {
        name: "Model",
        fieldType: "text",
        options: [],
        required: false,
      }),
    ).rejects.toThrow("Admin access required");
  });

  it("rejects reorder payloads with duplicate IDs", async () => {
    const admin = asUser(t, adminId);
    const first = await admin.mutation(api.customFields.createFieldDefinition, {
      name: "First",
      fieldType: "text",
      options: [],
      required: false,
    });
    const second = await admin.mutation(
      api.customFields.createFieldDefinition,
      {
        name: "Second",
        fieldType: "text",
        options: [],
        required: false,
      },
    );
    const third = await admin.mutation(api.customFields.createFieldDefinition, {
      name: "Third",
      fieldType: "text",
      options: [],
      required: false,
    });

    await expect(
      admin.mutation(api.customFields.reorderFieldDefinitions, {
        fieldDefinitionIds: [
          first.fieldDefinitionId,
          first.fieldDefinitionId,
          third.fieldDefinitionId,
        ],
      }),
    ).rejects.toThrow("Provide all field definitions when reordering");

    const rows = await admin.query(api.customFields.listFieldDefinitions, {});
    expect(rows.map((row) => row._id)).toEqual([
      first.fieldDefinitionId,
      second.fieldDefinitionId,
      third.fieldDefinitionId,
    ]);
  });

  it("blocks unsafe type changes and deletes when field is in use", async () => {
    const admin = asUser(t, adminId);
    const created = await admin.mutation(
      api.customFields.createFieldDefinition,
      {
        name: "Condition",
        fieldType: "dropdown",
        options: ["New", "Used"],
        required: false,
      },
    );

    await t.run(async (ctx) => {
      await ctx.db.patch(created.fieldDefinitionId, { usageCount: 2 });
    });

    await expect(
      admin.mutation(api.customFields.updateFieldDefinition, {
        fieldDefinitionId: created.fieldDefinitionId,
        name: "Condition",
        fieldType: "number",
        options: [],
        required: false,
      }),
    ).rejects.toThrow("incompatible type");

    await expect(
      admin.mutation(api.customFields.deleteFieldDefinition, {
        fieldDefinitionId: created.fieldDefinitionId,
      }),
    ).rejects.toThrow("cannot be deleted");
  });

  it("blocks deleting a field definition when a label template references it", async () => {
    const admin = asUser(t, adminId);
    const field = await admin.mutation(api.customFields.createFieldDefinition, {
      name: "QR payload",
      fieldType: "text",
      options: [],
      required: false,
    });

    await admin.mutation(api.labelTemplates.createTemplate, {
      name: "Template using custom field",
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
          fieldId: field.fieldDefinitionId,
        },
      ],
    });

    await expect(
      admin.mutation(api.customFields.deleteFieldDefinition, {
        fieldDefinitionId: field.fieldDefinitionId,
      }),
    ).rejects.toThrow("label template references it");
  });
});
