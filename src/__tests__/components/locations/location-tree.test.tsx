import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LocationTree,
  buildLocationChildrenMap,
  collectDescendantIds,
  type LocationTreeItem,
} from "@/components/locations/location-tree";

const locations: LocationTreeItem[] = [
  {
    _id: "root",
    name: "Warehouse",
    parentId: null,
    description: null,
    path: "Warehouse",
    createdAt: 1,
    updatedAt: 1,
  },
  {
    _id: "child",
    name: "Aisle 1",
    parentId: "root",
    description: null,
    path: "Warehouse / Aisle 1",
    createdAt: 2,
    updatedAt: 2,
  },
  {
    _id: "grandchild",
    name: "Bin 2",
    parentId: "child",
    description: null,
    path: "Warehouse / Aisle 1 / Bin 2",
    createdAt: 3,
    updatedAt: 3,
  },
];

describe("location tree helpers", () => {
  it("collects descendant ids", () => {
    const childrenByParent = buildLocationChildrenMap(locations);
    expect(
      Array.from(collectDescendantIds("root", childrenByParent)).sort(),
    ).toEqual(["child", "grandchild"]);
    expect(Array.from(collectDescendantIds("child", childrenByParent))).toEqual(
      ["grandchild"],
    );
  });
});

describe("LocationTree", () => {
  it("renders root nodes and expands nested children", async () => {
    const user = userEvent.setup();
    const onToggleExpand = vi.fn();
    const onSelect = vi.fn();

    const { rerender } = render(
      <LocationTree
        locations={locations}
        selectedId={null}
        expandedIds={new Set<string>()}
        canManage={false}
        onToggleExpand={onToggleExpand}
        onSelect={onSelect}
        onAddChild={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Warehouse/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Aisle 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand" }));
    expect(onToggleExpand).toHaveBeenCalledWith("root");

    rerender(
      <LocationTree
        locations={locations}
        selectedId={null}
        expandedIds={new Set(["root", "child"])}
        canManage={false}
        onToggleExpand={onToggleExpand}
        onSelect={onSelect}
        onAddChild={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Aisle 1")).toBeInTheDocument();
    expect(screen.getByText("Warehouse / Aisle 1 / Bin 2")).toBeInTheDocument();

    const rootLabel = screen.getAllByText("Warehouse")[0];
    const rootSelectButton = rootLabel.closest("button");
    expect(rootSelectButton).not.toBeNull();
    await user.click(rootSelectButton!);
    expect(onSelect).toHaveBeenCalledWith("root");
  });
});
