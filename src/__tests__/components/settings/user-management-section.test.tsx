import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listUsersMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/users", () => ({
  listUsers: () => listUsersMock(),
  createUser: vi.fn(),
  updateUserRole: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: vi.fn().mockResolvedValue({
    dateFormat: "DD-MM-YYYY",
    serviceSchedulingEnabled: true,
    updatedAt: null,
  }),
  setDateFormat: vi.fn(),
  setServiceSchedulingEnabled: vi.fn(),
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { UserManagementSection } from "@/components/settings/user-management-section";

const adminUser = {
  id: "user_admin",
  email: "admin@example.com",
  name: "Alex Admin",
  role: "admin" as const,
  createdBy: null,
  createdAt: Date.now(),
};

const secondUser = {
  id: "user_member",
  email: "member@example.com",
  name: "Morgan Member",
  role: "user" as const,
  createdBy: "user_admin",
  createdAt: Date.now(),
};

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("UserManagementSection", () => {
  beforeEach(() => {
    listUsersMock.mockReset();
    listUsersMock.mockResolvedValue([adminUser, secondUser]);
  });

  it("renders user list and opens the Add User dialog", async () => {
    const user = userEvent.setup();
    renderWithClient(<UserManagementSection currentUserId={adminUser.id} />);

    // Each user renders in both the mobile card list and the desktop table
    // (CSS-hidden per breakpoint); tests need to tolerate multiple matches.
    await waitFor(() => {
      expect(screen.getAllByText("Alex Admin").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Morgan Member").length).toBeGreaterThan(0);
    expect(screen.getAllByText("member@example.com").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /add user/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Temporary password")).toBeInTheDocument();
  });

  it("renders role select comboboxes for each user", async () => {
    renderWithClient(<UserManagementSection currentUserId={adminUser.id} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("combobox", { name: "Role for Alex Admin" })
          .length,
      ).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByRole("combobox", { name: "Role for Morgan Member" })
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders role select in create user dialog", async () => {
    const user = userEvent.setup();
    renderWithClient(<UserManagementSection currentUserId={adminUser.id} />);

    await waitFor(() => {
      expect(screen.getAllByText("Alex Admin").length).toBeGreaterThan(0);
    });
    await user.click(screen.getByRole("button", { name: /add user/i }));

    const comboboxes = screen.getAllByRole("combobox");
    // 2 per user (card + table) plus the Role select in the dialog.
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
  });

  it("renders save buttons for each user row", async () => {
    renderWithClient(<UserManagementSection currentUserId={adminUser.id} />);

    await waitFor(() => {
      const saveButtons = screen.getAllByRole("button", { name: "Save" });
      // 2 users, each rendered in both the mobile card list and the
      // desktop table → 4 buttons total in JSDOM.
      expect(saveButtons.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("SettingsPageClient with non-admin", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    listUsersMock.mockReset();
  });

  it("shows reduced settings for non-admin users", async () => {
    getCurrentUserMock.mockResolvedValue({ ...secondUser });

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
    expect(
      screen.queryByRole("button", { name: /add user/i }),
    ).not.toBeInTheDocument();
  });
});
