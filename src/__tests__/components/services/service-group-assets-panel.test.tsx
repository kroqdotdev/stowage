import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";

const listServiceGroupAssetsMock = vi.fn();

vi.mock("@/lib/api/service-groups", () => ({
  listServiceGroupAssets: (groupId: string) =>
    listServiceGroupAssetsMock(groupId),
}));

vi.mock("@/components/assets/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import { ServiceGroupAssetsPanel } from "@/components/services/service-group-assets-panel";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceGroupAssetsPanel", () => {
  beforeEach(() => {
    listServiceGroupAssetsMock.mockReset();
  });

  it("shows loading state when assets data is pending", () => {
    listServiceGroupAssetsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ServiceGroupAssetsPanel groupId="group1" />);

    // Mobile card list and desktop table each render their own loading copy
    expect(screen.getAllByText("Loading assets...").length).toBeGreaterThan(0);
  });

  it("shows empty state when no assets are assigned", async () => {
    listServiceGroupAssetsMock.mockResolvedValue([]);

    renderWithClient(<ServiceGroupAssetsPanel groupId="group1" />);

    await waitFor(() => {
      expect(
        screen.getAllByText("No assets are currently assigned to this group.")
          .length,
      ).toBeGreaterThan(0);
    });
  });

  it("renders asset list with links", async () => {
    listServiceGroupAssetsMock.mockResolvedValue([
      {
        id: "asset1",
        name: "Generator",
        assetTag: "AST-0001",
        status: "active",
      },
    ]);

    renderWithClient(<ServiceGroupAssetsPanel groupId="group1" />);

    await waitFor(() => {
      expect(
        within(screen.getByTestId("service-group-assets-card-list")).getByText(
          "Generator",
        ),
      ).toBeInTheDocument();
    });
    const mobile = within(screen.getByTestId("service-group-assets-card-list"));
    const desktop = within(screen.getByTestId("service-group-assets-table"));
    expect(mobile.getByText("AST-0001")).toBeInTheDocument();
    expect(mobile.getByText("active")).toBeInTheDocument();
    expect(desktop.getByText("Generator")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open asset" })).toHaveAttribute(
      "href",
      "/assets/asset1",
    );
  });
});
