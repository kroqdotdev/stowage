import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
  computeLocationPath,
  replaceLocationPathPrefix,
  requireLocationName,
  wouldCreateLocationCycle,
} from "../locations_helpers";

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
    const byId = new Map<string, { _id: string; parentId: string | null }>([
      ["root", { _id: "root", parentId: null }],
      ["child", { _id: "child", parentId: "root" }],
      ["grandchild", { _id: "grandchild", parentId: "child" }],
    ]);

    expect(wouldCreateLocationCycle("child", "grandchild", byId)).toBe(true);
    expect(wouldCreateLocationCycle("child", "root", byId)).toBe(false);
    expect(wouldCreateLocationCycle("child", null, byId)).toBe(false);
  });

  it("validates location names", () => {
    expect(requireLocationName("  Shelf 4 ")).toBe("Shelf 4");
    expect(() => requireLocationName(" ")).toThrowError(ConvexError);
  });
});
