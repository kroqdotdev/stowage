import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { render, screen } from "@testing-library/react"
import {
  AssetFilters,
  type AssetFiltersState,
} from "@/components/assets/asset-filters"

const options = {
  categories: [
    { _id: "cat1" as never, name: "IT", prefix: "IT", color: "#2563EB" },
  ],
  locations: [
    { _id: "loc1" as never, name: "Warehouse", parentId: null, path: "Warehouse" },
  ],
  tags: [
    { _id: "tag1" as never, _creationTime: 1, name: "Urgent", color: "#DC2626", createdAt: 1, updatedAt: 1 },
  ],
}

const emptyFilters: AssetFiltersState = {
  categoryId: null,
  status: null,
  locationId: null,
  tagIds: [],
}

describe("AssetFilters", () => {
  it("calls search and filter handlers", async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onFiltersChange = vi.fn()

    render(
      <AssetFilters
        options={options}
        search=""
        filters={emptyFilters}
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        onReset={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText("Search assets"), "router")
    expect(onSearchChange).toHaveBeenCalled()

    await user.selectOptions(screen.getByLabelText("Filter by category"), "cat1")
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...emptyFilters,
      categoryId: "cat1",
    })
  })

  it("resets when reset button is clicked", async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()

    render(
      <AssetFilters
        options={options}
        search="router"
        filters={{
          categoryId: "cat1" as never,
          status: "active",
          locationId: null,
          tagIds: [],
        }}
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onReset={onReset}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Reset" }))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
