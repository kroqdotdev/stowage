import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
      name: role === "admin" ? "Admin User" : "Member User",
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

const baseElements = [
  {
    id: "asset-tag",
    type: "assetTag" as const,
    xMm: 2,
    yMm: 2,
    widthMm: 18,
    heightMm: 5,
    fontSize: 8,
    fontWeight: "bold" as const,
    textAlign: "left" as const,
  },
  {
    id: "matrix",
    type: "dataMatrix" as const,
    xMm: 22,
    yMm: 1,
    widthMm: 10,
    heightMm: 10,
  },
];

describe("labelTemplates functions", () => {
  let t: ReturnType<typeof convexTest>;
  let adminId: Id<"users">;
  let userId: Id<"users">;
  let originalSiteUrl: string | undefined;

  beforeEach(async () => {
    originalSiteUrl = process.env.SITE_URL;
    t = convexTest(schema, modules);
    adminId = await insertUser(t, "admin");
    userId = await insertUser(t, "user");
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
      return;
    }

    process.env.SITE_URL = originalSiteUrl;
  });

  it("creates and lists label templates", async () => {
    const admin = asUser(t, adminId);

    await admin.mutation(api.labelTemplates.createTemplate, {
      name: "Custom thermal",
      widthMm: 35,
      heightMm: 12,
      elements: baseElements,
      isDefault: true,
    });

    const templates = await admin.query(api.labelTemplates.listTemplates, {});
    expect(templates).toHaveLength(1);
    expect(templates[0]?.name).toBe("Custom thermal");
    expect(templates[0]?.elements).toHaveLength(2);
  });

  it("sets one template as default and unsets the rest", async () => {
    const admin = asUser(t, adminId);

    const first = await admin.mutation(api.labelTemplates.createTemplate, {
      name: "First template",
      widthMm: 35,
      heightMm: 12,
      elements: baseElements,
      isDefault: true,
    });

    const second = await admin.mutation(api.labelTemplates.createTemplate, {
      name: "Second template",
      widthMm: 57,
      heightMm: 32,
      elements: [
        {
          id: "asset-name",
          type: "assetName" as const,
          xMm: 3,
          yMm: 3,
          widthMm: 26,
          heightMm: 6,
          fontSize: 9,
          fontWeight: "bold" as const,
          textAlign: "left" as const,
        },
      ],
      isDefault: false,
    });

    await admin.mutation(api.labelTemplates.setDefaultTemplate, {
      templateId: second.templateId,
    });

    const templates = await admin.query(api.labelTemplates.listTemplates, {});
    expect(
      templates.find((template) => template._id === first.templateId)
        ?.isDefault,
    ).toBe(false);
    expect(
      templates.find((template) => template._id === second.templateId)
        ?.isDefault,
    ).toBe(true);
  });

  it("returns the default template", async () => {
    const admin = asUser(t, adminId);
    await admin.mutation(api.labelTemplates.ensureDefaultTemplates, {});

    const template = await admin.query(
      api.labelTemplates.getDefaultTemplate,
      {},
    );
    expect(template?.name).toBe("Thermal 57x32 mm");
    expect(template?.isDefault).toBe(true);
  });

  it("returns the SITE_URL label base when configured", async () => {
    process.env.SITE_URL = "http://localhost:3000";

    const admin = asUser(t, adminId);
    const labelUrlBase = await admin.query(
      api.labelTemplates.getLabelUrlBase,
      {},
    );

    expect(labelUrlBase).toBe("http://localhost:3000");
  });

  it("rejects templates that reference a missing custom field", async () => {
    const admin = asUser(t, adminId);
    const field = await admin.mutation(api.customFields.createFieldDefinition, {
      name: "Label field",
      fieldType: "text",
      options: [],
      required: false,
    });

    await t.run(async (ctx) => {
      await ctx.db.delete(field.fieldDefinitionId);
    });

    await expect(
      admin.mutation(api.labelTemplates.createTemplate, {
        name: "Broken custom field template",
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
      }),
    ).rejects.toThrow("Referenced custom field is missing");
  });

  it("prevents deleting the default template", async () => {
    const admin = asUser(t, adminId);
    const created = await admin.mutation(api.labelTemplates.createTemplate, {
      name: "Protected template",
      widthMm: 35,
      heightMm: 12,
      elements: baseElements,
      isDefault: true,
    });

    await expect(
      admin.mutation(api.labelTemplates.deleteTemplate, {
        templateId: created.templateId,
      }),
    ).rejects.toThrow("cannot be deleted");
  });

  it("blocks non-admin writes", async () => {
    const user = asUser(t, userId);

    await expect(
      user.mutation(api.labelTemplates.createTemplate, {
        name: "User template",
        widthMm: 35,
        heightMm: 12,
        elements: baseElements,
        isDefault: false,
      }),
    ).rejects.toThrow("Admin access required");
  });
});
