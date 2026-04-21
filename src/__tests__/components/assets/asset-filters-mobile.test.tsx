import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AssetFiltersMobile } from "@/components/assets/asset-filters-mobile";
import type { AssetFiltersState } from "@/components/assets/asset-filters";
import type {
  AssetSortBy,
  AssetSortDirection,
} from "@/components/assets/asset-table";
import type { AssetFilterOptions } from "@/components/assets/types";

const options: AssetFilterOptions = {
  categories: [
    { id: "cat-1", name: "Power tools", prefix: null, color: "#c2410c" },
    { id: "cat-2", name: "Hand tools", prefix: null, color: "#6b8e6b" },
  ],
  locations: [
    {
      id: "loc-1",
      name: "Bench 1",
      parentId: null,
      path: "Workshop / Bench 1",
    },
    {
      id: "loc-2",
      name: "Bench 2",
      parentId: null,
      path: "Workshop / Bench 2",
    },
  ],
  tags: [
    {
      id: "t1",
      name: "electric",
      color: "#f59e0b",
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: "t2",
      name: "cordless",
      color: "#0d9488",
      createdAt: 0,
      updatedAt: 0,
    },
  ],
  serviceGroups: [],
};

type FilterState = {
  search: string;
  filters: AssetFiltersState;
  sortBy: AssetSortBy;
  sortDirection: AssetSortDirection;
};

function noopFilters(): FilterState {
  return {
    search: "",
    filters: {
      categoryId: null,
      status: null,
      locationId: null,
      tagIds: [],
    },
    sortBy: "createdAt",
    sortDirection: "desc",
  };
}

function renderFilters(overrides: Partial<FilterState> = {}) {
  const state: FilterState = { ...noopFilters(), ...overrides };
  const onSearchChange = vi.fn();
  const onFiltersChange = vi.fn();
  const onSortChange = vi.fn();
  const onReset = vi.fn();
  const utils = render(
    <AssetFiltersMobile
      options={options}
      search={state.search}
      filters={state.filters}
      sortBy={state.sortBy}
      sortDirection={state.sortDirection}
      onSearchChange={onSearchChange}
      onFiltersChange={onFiltersChange}
      onSortChange={onSortChange}
      onReset={onReset}
    />,
  );
  return {
    ...utils,
    handlers: { onSearchChange, onFiltersChange, onSortChange, onReset },
  };
}

describe("AssetFiltersMobile", () => {
  it("renders a search input and a filters trigger chip", () => {
    renderFilters();
    expect(
      screen.getByTestId("asset-filters-mobile-search"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("asset-filters-mobile-trigger"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("asset-filters-mobile-count")).toBeNull();
  });

  it("shows an active count badge when filters apply", () => {
    renderFilters({
      search: "drill",
      filters: {
        categoryId: "cat-1",
        status: "active",
        locationId: null,
        tagIds: ["t1"],
      },
    });
    const badge = screen.getByTestId("asset-filters-mobile-count");
    expect(badge.textContent).toBe("4");
  });

  it("opens the filters sheet and shows sections for status, category, location, tags, and sort", () => {
    renderFilters();
    fireEvent.click(screen.getByTestId("asset-filters-mobile-trigger"));

    const sheet = screen.getByTestId("asset-filters-sheet");
    expect(sheet).toBeInTheDocument();
    expect(screen.getByTestId("asset-sort-recent")).toBeInTheDocument();
    expect(screen.getByTestId("asset-filter-status-all")).toBeInTheDocument();
    expect(
      screen.getByTestId("asset-filter-status-active"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("asset-filter-category-cat-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("asset-filter-location-loc-2"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("asset-filter-tag-t1")).toBeInTheDocument();
  });

  it("selecting a status option emits onFiltersChange", () => {
    const { handlers } = renderFilters();
    fireEvent.click(screen.getByTestId("asset-filters-mobile-trigger"));
    fireEvent.click(screen.getByTestId("asset-filter-status-under_repair"));

    expect(handlers.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "under_repair" }),
    );
  });

  it("selecting a sort row emits onSortChange", () => {
    const { handlers } = renderFilters();
    fireEvent.click(screen.getByTestId("asset-filters-mobile-trigger"));
    fireEvent.click(screen.getByTestId("asset-sort-name"));

    expect(handlers.onSortChange).toHaveBeenCalledWith("name", "asc");
  });

  it("toggling a tag emits onFiltersChange with the tag added / removed", () => {
    const { handlers, rerender } = renderFilters();
    fireEvent.click(screen.getByTestId("asset-filters-mobile-trigger"));
    fireEvent.click(screen.getByTestId("asset-filter-tag-t1"));

    expect(handlers.onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: ["t1"] }),
    );

    rerender(
      <AssetFiltersMobile
        options={options}
        search=""
        filters={{
          categoryId: null,
          status: null,
          locationId: null,
          tagIds: ["t1"],
        }}
        sortBy="createdAt"
        sortDirection="desc"
        onSearchChange={() => {}}
        onFiltersChange={handlers.onFiltersChange}
        onSortChange={() => {}}
        onReset={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("asset-filters-mobile-trigger"));
    fireEvent.click(screen.getByTestId("asset-filter-tag-t1"));

    expect(handlers.onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ tagIds: [] }),
    );
  });

  it("reset button fires onReset and closes the sheet", () => {
    const { handlers } = renderFilters();
    fireEvent.click(screen.getByTestId("asset-filters-mobile-trigger"));
    fireEvent.click(screen.getByTestId("asset-filters-mobile-reset"));
    expect(handlers.onReset).toHaveBeenCalled();
  });
});
