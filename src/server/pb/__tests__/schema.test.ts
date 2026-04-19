import { describe, expect, it } from "vitest";

import { usePbHarness } from "@/test/pb-harness";

const EXPECTED_COLLECTIONS = [
  "users",
  "categories",
  "tags",
  "locations",
  "customFieldDefinitions",
  "appSettings",
  "serviceGroups",
  "serviceGroupFields",
  "serviceProviders",
  "assets",
  "assetTags",
  "attachments",
  "serviceSchedules",
  "serviceRecords",
  "serviceRecordAttachments",
  "labelTemplates",
];

describe("pb schema", () => {
  const getHarness = usePbHarness();

  it("creates every domain collection on a fresh instance", async () => {
    const collections = await getHarness().admin.collections.getFullList();
    const names = collections.map((c) => c.name).sort();

    for (const expected of EXPECTED_COLLECTIONS) {
      expect(names, `${expected} missing`).toContain(expected);
    }
  });

  it("enforces unique index on categories.normalizedName", async () => {
    const pb = getHarness().admin;
    await pb.collection("categories").create({
      name: "Tools",
      normalizedName: "tools",
      color: "#112233",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await expect(
      pb.collection("categories").create({
        name: "Tools duplicate",
        normalizedName: "tools",
        color: "#445566",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("enforces unique index on assets.assetTag", async () => {
    const pb = getHarness().admin;
    const admin = await pb.collection("users").create({
      email: `admin-${Math.random().toString(36).slice(2)}@stowage.local`,
      password: "password123",
      passwordConfirm: "password123",
      role: "admin",
      createdAt: Date.now(),
    });

    await pb.collection("assets").create({
      name: "Laptop",
      normalizedName: "laptop",
      assetTag: "AST-0001",
      status: "active",
      customFieldValues: {},
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await expect(
      pb.collection("assets").create({
        name: "Laptop 2",
        normalizedName: "laptop 2",
        assetTag: "AST-0001",
        status: "active",
        customFieldValues: {},
        createdBy: admin.id,
        updatedBy: admin.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("FTS5 triggers mirror asset writes into assets_fts", async () => {
    const pb = getHarness().admin;
    const admin = await pb.collection("users").create({
      email: `fts-${Math.random().toString(36).slice(2)}@stowage.local`,
      password: "password123",
      passwordConfirm: "password123",
      role: "admin",
      createdAt: Date.now(),
    });

    const laptop = await pb.collection("assets").create({
      name: "Thinkpad X1",
      normalizedName: "thinkpad x1",
      assetTag: "LAP-0100",
      status: "active",
      notes: "carbon fiber chassis",
      customFieldValues: {},
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    type RecordsResponse = {
      items: Array<{ id: string; assetTag: string }>;
    };

    const byId = (await fetch(
      `${getHarness().url}/api/collections/assets/records?filter=${encodeURIComponent(`id = "${laptop.id}"`)}`,
      { headers: { Authorization: pb.authStore.token } },
    ).then((r) => r.json())) as RecordsResponse;
    expect(byId.items[0].id).toBe(laptop.id);

    const byTag = await pb.send<RecordsResponse>(
      `/api/collections/assets/records`,
      {
        method: "GET",
        query: { filter: `assetTag = "LAP-0100"` },
      },
    );
    expect(byTag.items[0]?.assetTag).toBe("LAP-0100");
  });
});
