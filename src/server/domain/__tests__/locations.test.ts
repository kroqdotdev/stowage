import { describe, expect, it } from "vitest";

import {
  createLocation,
  deleteLocation,
  getLocationChildren,
  getLocationPath,
  listLocations,
  moveLocation,
  updateLocation,
  type LocationView,
} from "@/server/domain/locations";
import type { Ctx } from "@/server/pb/context";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/pb/errors";
import {
  computeLocationPath,
  replaceLocationPathPrefix,
  requireLocationName,
  wouldCreateLocationCycle,
} from "@/server/pb/locations";
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

describe("location helpers", () => {
  it("computes location paths from parent paths", () => {
    expect(computeLocationPath(null, "Warehouse")).toBe("Warehouse");
    expect(computeLocationPath("Warehouse", "Shelf 3")).toBe(
      "Warehouse / Shelf 3",
    );
  });

  it("replaces location path prefixes for descendants", () => {
    expect(
      replaceLocationPathPrefix(
        "Warehouse / Aisle 1 / Bin 2",
        "Warehouse / Aisle 1",
        "Warehouse / Aisle A",
      ),
    ).toBe("Warehouse / Aisle A / Bin 2");
    expect(
      replaceLocationPathPrefix(
        "Warehouse / Aisle 1",
        "Warehouse / Aisle 1",
        "Warehouse / Aisle A",
      ),
    ).toBe("Warehouse / Aisle A");
  });

  it("detects location cycles during moves", () => {
    const byId = new Map<string, { id: string; parentId: string | null }>([
      ["root", { id: "root", parentId: null }],
      ["child", { id: "child", parentId: "root" }],
      ["grandchild", { id: "grandchild", parentId: "child" }],
    ]);

    expect(wouldCreateLocationCycle("child", "grandchild", byId)).toBe(true);
    expect(wouldCreateLocationCycle("child", "root", byId)).toBe(false);
    expect(wouldCreateLocationCycle("child", null, byId)).toBe(false);
  });

  it("validates location names", () => {
    expect(requireLocationName("  Shelf 4 ")).toBe("Shelf 4");
    expect(() => requireLocationName(" ")).toThrowError(ValidationError);
  });
});

describe("locations domain", () => {
  const getHarness = usePbHarness();
  const ctx = (): Ctx => ({ pb: getHarness().admin });

  it("creates a root location with its own path", async () => {
    const warehouse = await createLocation(ctx(), { name: "Warehouse" });
    expect(warehouse).toMatchObject({
      name: "Warehouse",
      parentId: null,
      path: "Warehouse",
    });
  });

  it("creates nested locations that inherit the parent path", async () => {
    const warehouse = await createLocation(ctx(), { name: "Warehouse" });
    const aisle = await createLocation(ctx(), {
      name: "Aisle 1",
      parentId: warehouse.id,
    });
    const bin = await createLocation(ctx(), {
      name: "Bin A",
      parentId: aisle.id,
    });

    expect(aisle.path).toBe("Warehouse / Aisle 1");
    expect(bin.path).toBe("Warehouse / Aisle 1 / Bin A");
  });

  it("allows duplicate names under different parents", async () => {
    const w1 = await createLocation(ctx(), { name: "Warehouse 1" });
    const w2 = await createLocation(ctx(), { name: "Warehouse 2" });
    await createLocation(ctx(), { name: "Shelf 1", parentId: w1.id });
    await expect(
      createLocation(ctx(), { name: "Shelf 1", parentId: w2.id }),
    ).resolves.toBeTruthy();
  });

  it("rejects duplicate names within the same parent (case-insensitive)", async () => {
    const w = await createLocation(ctx(), { name: "Warehouse" });
    await createLocation(ctx(), { name: "Shelf 3", parentId: w.id });

    await expect(
      createLocation(ctx(), { name: " SHELF 3 ", parentId: w.id }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects duplicate names at root", async () => {
    await createLocation(ctx(), { name: "Warehouse" });
    await expect(
      createLocation(ctx(), { name: "warehouse" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws ValidationError if the parent does not exist", async () => {
    await expect(
      createLocation(ctx(), { name: "Orphan", parentId: "nonexistent0000" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("lists locations sorted by path (case-insensitive)", async () => {
    const warehouse = await createLocation(ctx(), { name: "warehouse" });
    await createLocation(ctx(), { name: "A bin", parentId: warehouse.id });
    await createLocation(ctx(), { name: "b bin", parentId: warehouse.id });
    await createLocation(ctx(), { name: "Office" });

    const list = await listLocations(ctx());
    expect(list.map((l: LocationView) => l.path)).toEqual([
      "Office",
      "warehouse",
      "warehouse / A bin",
      "warehouse / b bin",
    ]);
  });

  it("lists children of a parent", async () => {
    const warehouse = await createLocation(ctx(), { name: "Warehouse" });
    await createLocation(ctx(), { name: "Bin 3", parentId: warehouse.id });
    await createLocation(ctx(), { name: "Bin 1", parentId: warehouse.id });
    await createLocation(ctx(), { name: "Bin 2", parentId: warehouse.id });
    // Also a root node that should not appear.
    await createLocation(ctx(), { name: "Office" });

    const children = await getLocationChildren(ctx(), warehouse.id);
    expect(children.map((c: LocationView) => c.name)).toEqual([
      "Bin 1",
      "Bin 2",
      "Bin 3",
    ]);
  });

  it("lists root children when parentId is null", async () => {
    await createLocation(ctx(), { name: "Warehouse" });
    await createLocation(ctx(), { name: "Office" });
    const warehouse = await listLocations(ctx());
    const office = warehouse.find((l) => l.name === "Office")!;
    await createLocation(ctx(), { name: "Meeting Room", parentId: office.id });

    const roots = await getLocationChildren(ctx(), null);
    expect(roots.map((l) => l.name).sort()).toEqual(["Office", "Warehouse"]);
  });

  it("returns a location path by id or null when missing", async () => {
    const warehouse = await createLocation(ctx(), { name: "Warehouse" });
    await expect(getLocationPath(ctx(), warehouse.id)).resolves.toBe(
      "Warehouse",
    );
    await expect(getLocationPath(ctx(), "nonexistent0000")).resolves.toBeNull();
  });

  it("renames a location and rewrites its descendants' paths", async () => {
    const w = await createLocation(ctx(), { name: "Warehouse" });
    const a = await createLocation(ctx(), { name: "Aisle 1", parentId: w.id });
    const b = await createLocation(ctx(), { name: "Bin A", parentId: a.id });

    await updateLocation(ctx(), {
      locationId: a.id,
      name: "Aisle A",
      parentId: w.id,
    });

    const [rootPath, aisle, bin] = await Promise.all([
      getLocationPath(ctx(), w.id),
      getLocationPath(ctx(), a.id),
      getLocationPath(ctx(), b.id),
    ]);
    expect(rootPath).toBe("Warehouse");
    expect(aisle).toBe("Warehouse / Aisle A");
    expect(bin).toBe("Warehouse / Aisle A / Bin A");
  });

  it("moves a subtree to a new parent and rewrites descendant paths", async () => {
    const w1 = await createLocation(ctx(), { name: "Warehouse 1" });
    const w2 = await createLocation(ctx(), { name: "Warehouse 2" });
    const aisle = await createLocation(ctx(), {
      name: "Aisle 1",
      parentId: w1.id,
    });
    const bin = await createLocation(ctx(), {
      name: "Bin A",
      parentId: aisle.id,
    });

    await moveLocation(ctx(), { locationId: aisle.id, parentId: w2.id });

    await expect(getLocationPath(ctx(), aisle.id)).resolves.toBe(
      "Warehouse 2 / Aisle 1",
    );
    await expect(getLocationPath(ctx(), bin.id)).resolves.toBe(
      "Warehouse 2 / Aisle 1 / Bin A",
    );
  });

  it("refuses to move a location inside its own descendant", async () => {
    const a = await createLocation(ctx(), { name: "A" });
    const b = await createLocation(ctx(), { name: "B", parentId: a.id });
    const c = await createLocation(ctx(), { name: "C", parentId: b.id });

    await expect(
      moveLocation(ctx(), { locationId: a.id, parentId: c.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses to set a location as its own parent", async () => {
    const a = await createLocation(ctx(), { name: "A" });
    await expect(
      moveLocation(ctx(), { locationId: a.id, parentId: a.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses to rename into another sibling's name", async () => {
    const w = await createLocation(ctx(), { name: "Warehouse" });
    await createLocation(ctx(), { name: "Shelf 1", parentId: w.id });
    const shelf2 = await createLocation(ctx(), {
      name: "Shelf 2",
      parentId: w.id,
    });

    await expect(
      updateLocation(ctx(), {
        locationId: shelf2.id,
        name: " SHELF 1 ",
        parentId: w.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows updating a location to its own normalized name", async () => {
    const a = await createLocation(ctx(), { name: "Warehouse" });
    await expect(
      updateLocation(ctx(), {
        locationId: a.id,
        name: "warehouse",
        parentId: null,
      }),
    ).resolves.toMatchObject({ name: "warehouse", path: "warehouse" });
  });

  it("deletes a leaf location", async () => {
    const a = await createLocation(ctx(), { name: "Temp" });
    await expect(deleteLocation(ctx(), a.id)).resolves.toBeUndefined();
    await expect(listLocations(ctx())).resolves.toEqual([]);
  });

  it("refuses to delete a location that has child locations", async () => {
    const a = await createLocation(ctx(), { name: "A" });
    await createLocation(ctx(), { name: "B", parentId: a.id });

    await expect(deleteLocation(ctx(), a.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("refuses to delete a location that is assigned to an asset", async () => {
    const pb = getHarness().admin;
    const admin = await seedAdmin(pb);
    const location = await createLocation(ctx(), { name: "Closet" });

    await pb.collection("assets").create({
      name: "Laptop",
      normalizedName: "laptop",
      assetTag: "AST-0001",
      status: "active",
      locationId: location.id,
      customFieldValues: {},
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await expect(deleteLocation(ctx(), location.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("throws NotFoundError when deleting a missing location", async () => {
    await expect(
      deleteLocation(ctx(), "nonexistent0000"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
