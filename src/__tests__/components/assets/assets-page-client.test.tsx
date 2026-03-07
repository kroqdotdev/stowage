import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { AssetsPageClient } from "@/components/assets/assets-page-client";

const mockUseQuery = vi.fn();
const mockPush = vi.fn();
let currentSearchParams = new URLSearchParams();
const capturedListAssetArgs: Record<string, unknown>[] = [];

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
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

describe("AssetsPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockPush.mockReset();
    capturedListAssetArgs.length = 0;
    currentSearchParams = new URLSearchParams("category=cat1");

    mockUseQuery.mockImplementation((reference: unknown, args: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "assets:getAssetFilterOptions") {
        return {
          categories: [],
          locations: [],
          tags: [],
          serviceGroups: [],
        };
      }
      if (functionName === "assets:listAssets") {
        capturedListAssetArgs.push(args as Record<string, unknown>);
        return [];
      }
      return undefined;
    });
  });

  it("re-applies URL-driven filters when search params change", () => {
    const { rerender } = render(<AssetsPageClient />);

    expect(capturedListAssetArgs.at(-1)).toMatchObject({
      categoryId: "cat1",
      locationId: undefined,
      tagIds: [],
    });

    currentSearchParams = new URLSearchParams("location=loc1&tag=tag1");
    rerender(<AssetsPageClient />);

    expect(capturedListAssetArgs.at(-1)).toMatchObject({
      categoryId: undefined,
      locationId: "loc1",
      tagIds: ["tag1"],
    });
  });
});
