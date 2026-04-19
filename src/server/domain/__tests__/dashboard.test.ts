import { describe, expect, it } from "vitest";

import { updateDateFormat } from "@/server/domain/appSettings";
import { createAsset, updateAssetStatus } from "@/server/domain/assets";
import { createCategory } from "@/server/domain/categories";
import {
  getAssetCountsByStatus,
  getOverview,
  getRecentAssets,
  getUpcomingServicesPreview,
} from "@/server/domain/dashboard";
import { createLocation } from "@/server/domain/locations";
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

describe("dashboard domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("returns zero counts on an empty database", async () => {
    await expect(getAssetCountsByStatus(ctx())).resolves.toMatchObject({
      totalAssets: 0,
      statusCounts: {
        active: 0,
        in_storage: 0,
        under_repair: 0,
        retired: 0,
        disposed: 0,
      },
    });
  });

  it("counts assets by status", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId: a } = await createAsset(ctx(), {
      name: "A",
      actorId: admin.id,
    });
    const { assetId: b } = await createAsset(ctx(), {
      name: "B",
      actorId: admin.id,
    });
    await createAsset(ctx(), { name: "C", actorId: admin.id });
    await updateAssetStatus(ctx(), {
      assetId: a,
      status: "retired",
      actorId: admin.id,
    });
    await updateAssetStatus(ctx(), {
      assetId: b,
      status: "in_storage",
      actorId: admin.id,
    });

    const counts = await getAssetCountsByStatus(ctx());
    expect(counts.totalAssets).toBe(3);
    expect(counts.statusCounts.active).toBe(1);
    expect(counts.statusCounts.retired).toBe(1);
    expect(counts.statusCounts.in_storage).toBe(1);
  });

  it("returns up to 10 most-recently-updated assets", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    for (let i = 0; i < 12; i++) {
      await createAsset(ctx(), { name: `Asset ${i}`, actorId: admin.id });
    }
    const recents = await getRecentAssets(ctx());
    expect(recents.length).toBeLessThanOrEqual(10);
  });

  it("returns an overview with date format, breakdowns, and upcoming", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    await updateDateFormat(ctx(), {
      dateFormat: "YYYY-MM-DD",
      actorId: admin.id,
    });
    const it = await createCategory(ctx(), {
      name: "IT",
      prefix: "IT",
      color: "#2563EB",
    });
    const warehouse = await createLocation(ctx(), { name: "Warehouse" });
    await createAsset(ctx(), {
      name: "Laptop",
      categoryId: it.id,
      locationId: warehouse.id,
      actorId: admin.id,
    });
    await createAsset(ctx(), {
      name: "Pen",
      categoryId: it.id,
      actorId: admin.id,
    });

    const overview = await getOverview(ctx());
    expect(overview.dateFormat).toBe("YYYY-MM-DD");
    expect(overview.totalAssets).toBe(2);
    expect(
      overview.categoryBreakdown.find((entry) => entry.name === "IT")?.count,
    ).toBe(2);
    expect(
      overview.locationBreakdown.find(
        (entry) => entry.name === "Warehouse",
      )?.count,
    ).toBe(1);
  });

  it("upcoming services respects the serviceSchedulingEnabled toggle", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const { assetId } = await createAsset(ctx(), {
      name: "Laptop",
      actorId: admin.id,
    });
    await pb.collection("serviceSchedules").create({
      assetId,
      nextServiceDate: "2020-01-01",
      intervalValue: 30,
      intervalUnit: "days",
      reminderLeadValue: 7,
      reminderLeadUnit: "days",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: admin.id,
      updatedBy: admin.id,
    });

    const enabled = await getUpcomingServicesPreview(ctx());
    expect(enabled.overdueCount).toBeGreaterThanOrEqual(1);
    expect(enabled.items.length).toBeGreaterThanOrEqual(1);

    // Disable scheduling and confirm the preview empties.
    const admin2 = await seedAdmin(pb);
    const { updateServiceSchedulingEnabled } = await import(
      "@/server/domain/appSettings"
    );
    await updateServiceSchedulingEnabled(ctx(), {
      enabled: false,
      actorId: admin2.id,
    });
    await expect(getUpcomingServicesPreview(ctx())).resolves.toMatchObject({
      serviceSchedulingEnabled: false,
      overdueCount: 0,
      items: [],
    });
  });
});
