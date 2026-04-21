import { describe, expect, it } from "vitest";

import { createFieldDefinition } from "@/server/domain/customFields";
import {
  createTemplate,
  deleteTemplate,
  ensureDefaultTemplates,
  getDefaultTemplate,
  getTemplate,
  listTemplates,
  setDefaultTemplate,
  updateTemplate,
} from "@/server/domain/labelTemplates";
import type { Ctx } from "@/server/pb/context";
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

function baseTemplate(
  actorId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    name: "Thermal 57x32",
    widthMm: 57,
    heightMm: 32,
    isDefault: false,
    actorId,
    elements: [
      {
        id: "asset-tag",
        type: "assetTag" as const,
        xMm: 3,
        yMm: 3,
        widthMm: 25,
        heightMm: 6,
        fontSize: 10,
        fontWeight: "bold" as const,
        textAlign: "left" as const,
      },
    ],
    ...overrides,
  };
}

describe("labelTemplates domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("creates a template and makes the first one default", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const template = await createTemplate(ctx(), baseTemplate(admin.id));
    expect(template.isDefault).toBe(true);

    const list = await listTemplates(ctx());
    expect(list).toHaveLength(1);
    expect(list[0].isDefault).toBe(true);
  });

  it("keeps only one default when another template is created with isDefault=true", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createTemplate(ctx(), baseTemplate(admin.id, { name: "First" }));
    const second = await createTemplate(
      ctx(),
      baseTemplate(admin.id, { name: "Second", isDefault: true }),
    );
    const list = await listTemplates(ctx());
    const defaults = list.filter((t) => t.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.id);
  });

  it("rejects a duplicate template name", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createTemplate(ctx(), baseTemplate(admin.id));
    await expect(
      createTemplate(ctx(), baseTemplate(admin.id)),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects elements that escape the label bounds", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createTemplate(
        ctx(),
        baseTemplate(admin.id, {
          name: "Overflow",
          widthMm: 20,
          heightMm: 10,
          elements: [
            {
              id: "asset-tag",
              type: "assetTag" as const,
              xMm: 18,
              yMm: 8,
              widthMm: 10,
              heightMm: 6,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects customField elements without a fieldId", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createTemplate(
        ctx(),
        baseTemplate(admin.id, {
          name: "Missing field",
          elements: [
            {
              id: "custom",
              type: "customField" as const,
              xMm: 2,
              yMm: 2,
              widthMm: 20,
              heightMm: 5,
              fontSize: 8,
              textAlign: "left" as const,
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects customField elements referencing a missing field", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      createTemplate(
        ctx(),
        baseTemplate(admin.id, {
          name: "Bad ref",
          elements: [
            {
              id: "custom",
              type: "customField" as const,
              xMm: 2,
              yMm: 2,
              widthMm: 20,
              heightMm: 5,
              fontSize: 8,
              textAlign: "left" as const,
              fieldId: "nonexistent0000",
            },
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("accepts customField elements referencing an existing field", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const field = await createFieldDefinition(ctx(), {
      name: "QR payload",
      fieldType: "text",
      required: false,
    });
    await expect(
      createTemplate(
        ctx(),
        baseTemplate(admin.id, {
          name: "Custom fields",
          elements: [
            {
              id: "custom",
              type: "customField" as const,
              xMm: 2,
              yMm: 2,
              widthMm: 20,
              heightMm: 5,
              fontSize: 8,
              textAlign: "left" as const,
              fieldId: field.id,
            },
          ],
        }),
      ),
    ).resolves.toBeTruthy();
  });

  it("refuses to clear the default flag during update without a replacement", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const created = await createTemplate(ctx(), baseTemplate(admin.id));
    await expect(
      updateTemplate(ctx(), {
        ...baseTemplate(admin.id),
        templateId: created.id,
        isDefault: false,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("refuses to delete the default template", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const created = await createTemplate(ctx(), baseTemplate(admin.id));
    await expect(deleteTemplate(ctx(), created.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("deletes a non-default template", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await createTemplate(ctx(), baseTemplate(admin.id, { name: "First" }));
    const other = await createTemplate(
      ctx(),
      baseTemplate(admin.id, { name: "Second" }),
    );
    await expect(deleteTemplate(ctx(), other.id)).resolves.toBeUndefined();
  });

  it("setDefaultTemplate switches the default flag", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const first = await createTemplate(
      ctx(),
      baseTemplate(admin.id, { name: "First" }),
    );
    const second = await createTemplate(
      ctx(),
      baseTemplate(admin.id, { name: "Second" }),
    );
    await setDefaultTemplate(ctx(), second.id);
    const list = await listTemplates(ctx());
    const defaults = list.filter((t) => t.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.id);
    expect(list.find((t) => t.id === first.id)?.isDefault).toBe(false);
  });

  it("getTemplate returns null for missing id", async () => {
    await expect(getTemplate(ctx(), "nonexistent0000")).resolves.toBeNull();
  });

  it("ensureDefaultTemplates seeds built-ins when empty and does nothing when present", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);

    const first = await ensureDefaultTemplates(ctx(), admin.id);
    expect(first.seeded).toBe(true);

    const list = await listTemplates(ctx());
    expect(list.length).toBeGreaterThanOrEqual(2);
    const defaults = list.filter((t) => t.isDefault);
    expect(defaults).toHaveLength(1);

    const second = await ensureDefaultTemplates(ctx(), admin.id);
    expect(second.seeded).toBe(false);
  });

  it("getDefaultTemplate returns the current default or the only template", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(getDefaultTemplate(ctx())).resolves.toBeNull();
    await createTemplate(ctx(), baseTemplate(admin.id));
    const def = await getDefaultTemplate(ctx());
    expect(def?.isDefault).toBe(true);
  });

  it("throws NotFoundError on unknown template update", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      updateTemplate(ctx(), {
        ...baseTemplate(admin.id),
        templateId: "nonexistent0000",
        isDefault: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
