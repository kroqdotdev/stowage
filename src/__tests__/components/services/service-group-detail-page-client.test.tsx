import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getServiceGroupMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/service-groups", () => ({
  getServiceGroup: (groupId: string) => getServiceGroupMock(groupId),
  updateServiceGroup: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/components/services/services-nav-tabs", () => ({
  ServicesNavTabs: () => <div>NavTabs</div>,
}));

vi.mock("@/components/services/service-group-fields-panel", () => ({
  ServiceGroupFieldsPanel: () => <div>FieldsPanel</div>,
}));

vi.mock("@/components/services/service-group-assets-panel", () => ({
  ServiceGroupAssetsPanel: () => <div>AssetsPanel</div>,
}));

vi.mock("@/components/services/service-group-editor", () => ({
  ServiceGroupEditor: () => <div>GroupEditor</div>,
}));

import { ServiceGroupDetailPageClient } from "@/components/services/service-group-detail-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceGroupDetailPageClient", () => {
  beforeEach(() => {
    getServiceGroupMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
  });

  it("shows loading state when data is pending", () => {
    getServiceGroupMock.mockImplementation(() => new Promise(() => {}));
    getCurrentUserMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ServiceGroupDetailPageClient groupId="group1" />);

    expect(screen.getByText("Loading group...")).toBeInTheDocument();
  });

  it("shows not-found state when group is null", async () => {
    getServiceGroupMock.mockResolvedValue(null);

    renderWithClient(<ServiceGroupDetailPageClient groupId="group1" />);

    await waitFor(() => {
      expect(screen.getByText("Group not found")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: "Back to groups" }),
    ).toHaveAttribute("href", "/services/groups");
  });

  it("renders group details with sub-panels for admin users", async () => {
    getServiceGroupMock.mockResolvedValue({
      id: "group1",
      name: "Engine checks",
      description: "Quarterly maintenance",
    });

    renderWithClient(<ServiceGroupDetailPageClient groupId="group1" />);

    await waitFor(() => {
      expect(screen.getByText("Engine checks")).toBeInTheDocument();
    });
    expect(screen.getByText("Quarterly maintenance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit group" }),
    ).toBeInTheDocument();
    expect(screen.getByText("FieldsPanel")).toBeInTheDocument();
    expect(screen.getByText("AssetsPanel")).toBeInTheDocument();
  });
});
