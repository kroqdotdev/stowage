import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getCurrentUserMock = vi.fn();
const getAppSettingsMock = vi.fn();
const listUsersMock = vi.fn();

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => getAppSettingsMock(),
  setDateFormat: vi.fn(),
  setServiceSchedulingEnabled: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({
  listUsers: () => listUsersMock(),
  createUser: vi.fn(),
  updateUserRole: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { SettingsPageClient } from "@/components/settings/settings-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("SettingsPageClient", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    getAppSettingsMock.mockReset();
    listUsersMock.mockReset();
    listUsersMock.mockResolvedValue([]);
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
  });

  it("shows skeleton loading when currentUser is pending", () => {
    getCurrentUserMock.mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithClient(<SettingsPageClient />);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThanOrEqual(2);
  });

  it("shows access denied when currentUser is null", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    renderWithClient(<SettingsPageClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Access denied" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Sign in to manage account settings."),
    ).toBeInTheDocument();
  });

  it("renders admin sections for admin users", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      role: "admin",
      name: "Admin",
      email: "admin@example.com",
    });

    renderWithClient(<SettingsPageClient />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Change password" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: "Features" }),
    ).toBeInTheDocument();
  });

  it("shows non-admin message for regular users", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user2",
      role: "user",
      name: "Member",
      email: "member@example.com",
    });

    renderWithClient(<SettingsPageClient />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Only admins can manage date format, features, and users.",
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
  });
});
