import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { AssetDetailPageClient } from "@/components/assets/asset-detail-page-client";

const mockUseQuery = vi.fn<(...args: unknown[]) => unknown>();
const mockUseMutation = vi.fn<(...args: unknown[]) => unknown>(() => vi.fn());
const mockPush = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/assets/asset-detail", () => ({
  AssetDetail: ({
    asset,
    canDelete,
  }: {
    asset: { name: string };
    canDelete: boolean;
  }) => (
    <div>
      <span>detail:{asset.name}</span>
      {canDelete && <button>Delete</button>}
    </div>
  ),
}));

vi.mock("@/components/assets/error-messages", () => ({
  getAssetUiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const assetData = {
  _id: "asset1" as never,
  _creationTime: 1,
  name: "Test Router",
  assetTag: "IT-0001",
  status: "active" as const,
  categoryId: null,
  locationId: null,
  serviceGroupId: null,
  notes: null,
  customFieldValues: {},
  createdBy: "user1" as never,
  updatedBy: "user1" as never,
  createdAt: 1,
  updatedAt: 1,
  category: null,
  location: null,
  serviceGroup: null,
  tags: [],
};

describe("AssetDetailPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
    mockPush.mockReset();
  });

  it("shows loading state when queries are pending", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<AssetDetailPageClient assetId={"asset1" as never} />);

    expect(screen.getByText("Loading asset...")).toBeInTheDocument();
  });

  it("shows not-found state when asset is null", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "assets:getAsset") return null;
      if (functionName === "users:getCurrentUser")
        return { _id: "user1", role: "admin" };
      if (functionName === "customFields:listFieldDefinitions") return [];
      return undefined;
    });

    render(<AssetDetailPageClient assetId={"asset1" as never} />);

    expect(screen.getByText("Asset not found")).toBeInTheDocument();
    expect(screen.getByText("Back to assets")).toBeInTheDocument();
  });

  it("renders AssetDetail when data is loaded", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "assets:getAsset") return assetData;
      if (functionName === "users:getCurrentUser")
        return { _id: "user1", role: "admin" };
      if (functionName === "customFields:listFieldDefinitions") return [];
      return undefined;
    });

    render(<AssetDetailPageClient assetId={"asset1" as never} />);

    expect(screen.getByText("detail:Test Router")).toBeInTheDocument();
  });

  it("passes canDelete=true for admin users", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "assets:getAsset") return assetData;
      if (functionName === "users:getCurrentUser")
        return { _id: "user1", role: "admin" };
      if (functionName === "customFields:listFieldDefinitions") return [];
      return undefined;
    });

    render(<AssetDetailPageClient assetId={"asset1" as never} />);

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("passes canDelete=false for non-admin users", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "assets:getAsset") return assetData;
      if (functionName === "users:getCurrentUser")
        return { _id: "user1", role: "member" };
      if (functionName === "customFields:listFieldDefinitions") return [];
      return undefined;
    });

    render(<AssetDetailPageClient assetId={"asset1" as never} />);

    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
