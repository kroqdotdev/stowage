import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getAssetMock = vi.fn();
const updateAssetStatusMock = vi.fn();
const deleteAssetMock = vi.fn();
const listCustomFieldsMock = vi.fn();
const getCurrentUserMock = vi.fn();
const mockPush = vi.fn();

vi.mock("@/lib/api/assets", () => ({
  getAsset: (id: string) => getAssetMock(id),
  updateAssetStatus: (id: string, status: string) =>
    updateAssetStatusMock(id, status),
  deleteAsset: (id: string) => deleteAssetMock(id),
}));

vi.mock("@/lib/api/custom-fields", () => ({
  listCustomFields: () => listCustomFieldsMock(),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
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

import { AssetDetailPageClient } from "@/components/assets/asset-detail-page-client";

const assetData = {
  id: "asset1",
  name: "Test Router",
  assetTag: "IT-0001",
  status: "active" as const,
  categoryId: null,
  locationId: null,
  serviceGroupId: null,
  notes: null,
  customFieldValues: {},
  createdBy: "user1",
  updatedBy: "user1",
  createdAt: 1,
  updatedAt: 1,
  category: null,
  location: null,
  serviceGroup: null,
  tags: [],
};

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("AssetDetailPageClient", () => {
  beforeEach(() => {
    getAssetMock.mockReset();
    updateAssetStatusMock.mockReset();
    deleteAssetMock.mockReset();
    listCustomFieldsMock.mockReset();
    getCurrentUserMock.mockReset();
    mockPush.mockReset();

    listCustomFieldsMock.mockResolvedValue([]);
  });

  it("shows loading state when queries are pending", () => {
    getAssetMock.mockImplementation(() => new Promise(() => {}));
    getCurrentUserMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<AssetDetailPageClient assetId="asset1" />);

    expect(screen.getByText("Loading asset...")).toBeInTheDocument();
  });

  it("shows not-found state when asset is null", async () => {
    getAssetMock.mockResolvedValue(null);
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "admin@x.com",
      name: "Admin",
      role: "admin",
    });

    renderWithClient(<AssetDetailPageClient assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("Asset not found")).toBeInTheDocument();
    });
    expect(screen.getByText("Back to assets")).toBeInTheDocument();
  });

  it("renders AssetDetail when data is loaded", async () => {
    getAssetMock.mockResolvedValue(assetData);
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "admin@x.com",
      name: "Admin",
      role: "admin",
    });

    renderWithClient(<AssetDetailPageClient assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("detail:Test Router")).toBeInTheDocument();
    });
  });

  it("passes canDelete=true for admin users", async () => {
    getAssetMock.mockResolvedValue(assetData);
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "admin@x.com",
      name: "Admin",
      role: "admin",
    });

    renderWithClient(<AssetDetailPageClient assetId="asset1" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Delete" }),
      ).toBeInTheDocument();
    });
  });

  it("passes canDelete=false for non-admin users", async () => {
    getAssetMock.mockResolvedValue(assetData);
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "member@x.com",
      name: "Member",
      role: "user",
    });

    renderWithClient(<AssetDetailPageClient assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("detail:Test Router")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
