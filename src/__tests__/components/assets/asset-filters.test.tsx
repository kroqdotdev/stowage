import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import {
  AssetFilters,
  type AssetFiltersState,
} from "@/components/assets/asset-filters";

const options = {
  categories: [{ id: "cat1", name: "IT", prefix: "IT", color: "#2563EB" }],
  locations: [
    {
      id: "loc1",
      name: "Warehouse",
      parentId: null,
      path: "Warehouse",
    },
  ],
  tags: [
    {
      id: "tag1",
      name: "Urgent",
      color: "#DC2626",
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  serviceGroups: [],
};

const emptyFilters: AssetFiltersState = {
  categoryId: null,
  status: null,
  locationId: null,
  tagIds: [],
};

describe("AssetFilters", () => {
  it("calls search handler when typing", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(
      <AssetFilters
        options={options}
        search=""
        filters={emptyFilters}
        onSearchChange={onSearchChange}
        onFiltersChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Search assets"), "router");
    expect(onSearchChange).toHaveBeenCalled();
  });

  it("renders category filter trigger", () => {
    render(
      <AssetFilters
        options={options}
        search=""
        filters={emptyFilters}
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Filter by category" }),
    ).toBeInTheDocument();
  });

  it("resets when reset button is clicked", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <AssetFilters
        options={options}
        search="router"
        filters={{
          categoryId: "cat1",
          status: "active",
          locationId: null,
          tagIds: [],
        }}
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onReset={onReset}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("exposes accessible labels for custom location and keyword filters", () => {
    render(
      <AssetFilters
        options={options}
        search=""
        filters={emptyFilters}
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Location" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keywords" })).toBeInTheDocument();
  });

  it("shows the one set of dropdowns when More filters is opened", async () => {
    const user = userEvent.setup();

    render(
      <AssetFilters
        options={options}
        search=""
        filters={emptyFilters}
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const more = screen.getByRole("button", { name: "More filters" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    const row = screen.getByRole("button", { name: "Keywords" }).parentElement!;
    expect(row).toHaveClass("hidden");

    await user.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    // Rendered once, so ids such as asset-filter-tags stay unique.
    expect(screen.getAllByRole("button", { name: "Keywords" })).toHaveLength(1);
    expect(row).not.toHaveClass("hidden");
  });

  it("toggles a keyword from the keywords picker", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();

    render(
      <AssetFilters
        options={options}
        search=""
        filters={emptyFilters}
        onSearchChange={vi.fn()}
        onFiltersChange={onFiltersChange}
        onReset={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Keywords" }));
    await user.click(await screen.findByRole("option", { name: /Urgent/ }));
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...emptyFilters,
      tagIds: ["tag1"],
    });
  });

  it("shows applied filters as removable chips", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const onSearchChange = vi.fn();
    const filters: AssetFiltersState = {
      categoryId: "cat1",
      status: null,
      locationId: "loc1",
      tagIds: ["tag1"],
    };

    render(
      <AssetFilters
        options={options}
        search="router"
        filters={filters}
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        onReset={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove category filter" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...filters, categoryId: null });

    await user.click(screen.getByRole("button", { name: "Remove location filter" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...filters, locationId: null });

    await user.click(screen.getByRole("button", { name: "Remove keyword filter" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...filters, tagIds: [] });

    await user.click(screen.getByRole("button", { name: "Remove search filter" }));
    expect(onSearchChange).toHaveBeenLastCalledWith("");
  });

  it("never shows status as a chip, because status has its own tabs", () => {
    render(
      <AssetFilters
        options={options}
        search=""
        filters={{ ...emptyFilters, status: "under_repair" }}
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Remove status filter" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
  });
});
