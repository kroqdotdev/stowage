import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseAction = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useAction: (...args: unknown[]) => mockUseAction(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { SettingsPageClient } from "@/components/settings/settings-page-client";

describe("SettingsPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseAction.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
    mockUseAction.mockReturnValue(vi.fn());
  });

  it("shows skeleton loading when currentUser is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    const { container } = render(<SettingsPageClient />);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThanOrEqual(2);
  });

  it("shows access denied when currentUser is null", () => {
    mockUseQuery.mockReturnValue(null);

    render(<SettingsPageClient />);

    expect(
      screen.getByRole("heading", { name: "Access denied" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to manage account settings."),
    ).toBeInTheDocument();
  });

  it("renders admin sections for admin users", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const name = getFunctionName(reference as never);
      if (name === "users:getCurrentUser") {
        return {
          _id: "user1" as never,
          role: "admin",
          name: "Admin",
          email: "admin@example.com",
        };
      }
      if (name === "users:listUsers") {
        return [];
      }
      if (name === "appSettings:getAppSettings") {
        return {
          dateFormat: "DD-MM-YYYY",
          serviceSchedulingEnabled: true,
        };
      }
      return undefined;
    });

    render(<SettingsPageClient />);

    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Features" }),
    ).toBeInTheDocument();
  });

  it("shows non-admin message for regular users", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const name = getFunctionName(reference as never);
      if (name === "users:getCurrentUser") {
        return {
          _id: "user2" as never,
          role: "user",
          name: "Member",
          email: "member@example.com",
        };
      }
      return undefined;
    });

    render(<SettingsPageClient />);

    expect(
      screen.getByText("Only admins can manage date format, features, and users."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
  });
});
