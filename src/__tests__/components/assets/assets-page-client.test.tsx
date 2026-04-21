import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const listAssetsMock = vi.fn();
const getFilterOptionsMock = vi.fn();
const mockPush = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("@/lib/api/assets", () => ({
  listAssets: (params: unknown) => listAssetsMock(params),
  getAssetFilterOptions: () => getFilterOptionsMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/components/assets/asset-filters", () => ({
  AssetFilters: () => <div>filters</div>,
}));

vi.mock("@/components/assets/asset-table", () => ({
  AssetTable: () => <div>table</div>,
}));

import { AssetsPageClient } from "@/components/assets/assets-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  );
  return {
    ...result,
    rerender: (next: React.ReactElement) =>
      result.rerender(
        <QueryClientProvider client={qc}>{next}</QueryClientProvider>,
      ),
  };
}

describe("AssetsPageClient", () => {
  beforeEach(() => {
    listAssetsMock.mockReset();
    getFilterOptionsMock.mockReset();
    mockPush.mockReset();
    currentSearchParams = new URLSearchParams("category=cat1");

    listAssetsMock.mockResolvedValue([]);
    getFilterOptionsMock.mockResolvedValue({
      categories: [],
      locations: [],
      tags: [],
      serviceGroups: [],
    });
  });

  it("re-applies URL-driven filters when search params change", async () => {
    const { rerender } = renderWithClient(<AssetsPageClient />);

    await waitFor(() => {
      expect(listAssetsMock).toHaveBeenCalled();
    });
    expect(listAssetsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      categoryId: "cat1",
      locationId: undefined,
      tagIds: [],
    });

    currentSearchParams = new URLSearchParams("location=loc1&tag=tag1");
    rerender(<AssetsPageClient />);

    await waitFor(() => {
      expect(listAssetsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        categoryId: undefined,
        locationId: "loc1",
        tagIds: ["tag1"],
      });
    });
  });
});
