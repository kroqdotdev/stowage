import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceProvidersPageClient } from "@/components/services/service-providers-page-client";

const mockUseQuery = vi.fn();
const createProviderMock = vi.fn().mockResolvedValue(null);
const updateProviderMock = vi.fn().mockResolvedValue(null);
const deleteProviderMock = vi.fn().mockResolvedValue(null);

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceProviders:createProvider") {
      return createProviderMock;
    }
    if (functionName === "serviceProviders:updateProvider") {
      return updateProviderMock;
    }
    if (functionName === "serviceProviders:deleteProvider") {
      return deleteProviderMock;
    }
    return vi.fn();
  },
}));

vi.mock("@/components/services/services-nav-tabs", () => ({
  ServicesNavTabs: () => <div>NavTabs</div>,
}));

describe("ServiceProvidersPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    createProviderMock.mockClear();
    updateProviderMock.mockClear();
    deleteProviderMock.mockClear();
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<ServiceProvidersPageClient />);

    expect(
      screen.getByText("Loading service providers..."),
    ).toBeInTheDocument();
  });

  it("renders empty state when no providers exist", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "users:getCurrentUser") {
        return { _id: "user1", role: "admin" };
      }
      if (functionName === "serviceProviders:listProviders") {
        return [];
      }
      return undefined;
    });

    render(<ServiceProvidersPageClient />);

    expect(screen.getByText("No service providers yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add provider/ }),
    ).toBeInTheDocument();
  });

  it("renders provider list and opens create dialog for admins", async () => {
    const user = userEvent.setup();

    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "users:getCurrentUser") {
        return { _id: "user1", role: "admin" };
      }
      if (functionName === "serviceProviders:listProviders") {
        return [
          {
            _id: "provider1" as never,
            _creationTime: 1,
            name: "Dockside Repair",
            contactEmail: "dock@example.com",
            contactPhone: null,
            notes: null,
            createdAt: 1,
            updatedAt: 1,
            createdBy: "user1" as never,
            updatedBy: "user1" as never,
          },
        ];
      }
      return undefined;
    });

    render(<ServiceProvidersPageClient />);

    expect(screen.getByText("Dockside Repair")).toBeInTheDocument();
    expect(screen.getByText("dock@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add provider/ }));
    expect(
      screen.getByRole("heading", { name: "Add provider" }),
    ).toBeVisible();
  });
});
