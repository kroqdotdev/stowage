import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AssetTable } from "@/components/assets/asset-table";
import type { AssetListItem } from "@/components/assets/types";

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

const rows: AssetListItem[] = [
  {
    _id: "asset1" as never,
    _creationTime: 1,
    name: "Router",
    assetTag: "AST-0001",
    status: "active",
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    locationId: null,
    locationPath: null,
    serviceGroupId: null,
    notes: null,
    tagIds: [],
    tagNames: [],
    createdAt: 1,
    updatedAt: 1,
  },
];

describe("AssetTable", () => {
  it("opens row when activated by keyboard", () => {
    const onRowOpen = vi.fn();

    render(
      <AssetTable
        rows={rows}
        loading={false}
        sortBy="createdAt"
        sortDirection="desc"
        selectedIds={new Set()}
        onSort={vi.fn()}
        onSelectRow={vi.fn()}
        onSelectAll={vi.fn()}
        onRowOpen={onRowOpen}
      />,
    );

    const row = screen.getByText("Router").closest("tr");
    expect(row).not.toBeNull();

    row!.focus();
    fireEvent.keyDown(row!, { key: "Enter" });
    fireEvent.keyDown(row!, { key: " " });

    expect(onRowOpen).toHaveBeenCalledTimes(2);
    expect(onRowOpen).toHaveBeenCalledWith("asset1");
  });
});
