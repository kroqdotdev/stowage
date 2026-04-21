import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listServiceProvidersMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/service-providers", () => ({
  listServiceProviders: () => listServiceProvidersMock(),
  createServiceProvider: vi.fn().mockResolvedValue(null),
  updateServiceProvider: vi.fn().mockResolvedValue(null),
  deleteServiceProvider: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/components/services/services-nav-tabs", () => ({
  ServicesNavTabs: () => <div>NavTabs</div>,
}));

import { ServiceProvidersPageClient } from "@/components/services/service-providers-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceProvidersPageClient", () => {
  beforeEach(() => {
    listServiceProvidersMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
  });

  it("shows loading state when data is pending", () => {
    listServiceProvidersMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ServiceProvidersPageClient />);

    expect(
      screen.getByText("Loading service providers..."),
    ).toBeInTheDocument();
  });

  it("renders empty state when no providers exist", async () => {
    listServiceProvidersMock.mockResolvedValue([]);

    renderWithClient(<ServiceProvidersPageClient />);

    await waitFor(() => {
      expect(screen.getByText("No service providers yet.")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Add provider/ }),
    ).toBeInTheDocument();
  });

  it("renders provider list and opens create dialog for admins", async () => {
    const user = userEvent.setup();

    listServiceProvidersMock.mockResolvedValue([
      {
        id: "provider1",
        name: "Dockside Repair",
        contactEmail: "dock@example.com",
        contactPhone: null,
        notes: null,
        createdAt: 1,
        updatedAt: 1,
        createdBy: "user1",
        updatedBy: "user1",
      },
    ]);

    renderWithClient(<ServiceProvidersPageClient />);

    await waitFor(() => {
      expect(screen.getByText("Dockside Repair")).toBeInTheDocument();
    });
    expect(screen.getByText("dock@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add provider/ }));
    expect(screen.getByRole("heading", { name: "Add provider" })).toBeVisible();
  });
});
