import { describe, expect, it } from "vitest";

import {
  getAppSettings,
  updateDateFormat,
  updateServiceSchedulingEnabled,
} from "@/server/domain/appSettings";
import type { Ctx } from "@/server/pb/context";
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

describe("appSettings domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("returns defaults when no settings row exists", async () => {
    await expect(getAppSettings(ctx())).resolves.toEqual({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
  });

  it("updates date format and persists across reads", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const view = await updateDateFormat(ctx(), {
      dateFormat: "YYYY-MM-DD",
      actorId: admin.id,
    });
    expect(view.dateFormat).toBe("YYYY-MM-DD");
    expect(view.updatedAt).toBeGreaterThan(0);

    await expect(getAppSettings(ctx())).resolves.toMatchObject({
      dateFormat: "YYYY-MM-DD",
      serviceSchedulingEnabled: true,
    });
  });

  it("updates service scheduling toggle and keeps date format", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await updateDateFormat(ctx(), {
      dateFormat: "MM-DD-YYYY",
      actorId: admin.id,
    });
    const view = await updateServiceSchedulingEnabled(ctx(), {
      enabled: false,
      actorId: admin.id,
    });
    expect(view).toMatchObject({
      dateFormat: "MM-DD-YYYY",
      serviceSchedulingEnabled: false,
    });

    await expect(getAppSettings(ctx())).resolves.toMatchObject({
      dateFormat: "MM-DD-YYYY",
      serviceSchedulingEnabled: false,
    });
  });

  it("rejects invalid date formats at the Zod boundary", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await expect(
      updateDateFormat(ctx(), {
        // @ts-expect-error intentionally invalid
        dateFormat: "DD/MM/YYYY",
        actorId: admin.id,
      }),
    ).rejects.toThrow();
  });
});
