import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listServiceGroupsMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/service-groups", () => ({
  listServiceGroups: () => listServiceGroupsMock(),
  createServiceGroup: vi.fn().mockResolvedValue({ id: "group1" }),
  updateServiceGroup: vi.fn().mockResolvedValue(null),
  deleteServiceGroup: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

import { ServiceGroupsList } from "@/components/services/service-groups-list";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceGroupsList", () => {
  beforeEach(() => {
    listServiceGroupsMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
  });

  it("renders groups and allows admins to open create dialog", async () => {
    const user = userEvent.setup();
    listServiceGroupsMock.mockResolvedValue([
      {
        id: "group1",
        name: "Engine checks",
        description: "Quarterly",
        createdAt: 1,
        updatedAt: 1,
        assetCount: 2,
        fieldCount: 3,
      },
    ]);

    renderWithClient(<ServiceGroupsList />);

    await waitFor(() => {
      expect(screen.getByText("Engine checks")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Create group" }));
    expect(
      screen.getByRole("heading", { name: "Create service group" }),
    ).toBeVisible();
  });
});
