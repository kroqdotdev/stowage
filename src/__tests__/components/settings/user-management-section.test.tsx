import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createUserMock = vi.fn();
const updateUserRoleMock = vi.fn();
const changePasswordMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const mockUseQuery = vi.fn();
const mockUseAction = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useAction: (...args: unknown[]) => mockUseAction(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { UserManagementSection } from "@/components/settings/user-management-section";

const adminUser = {
  _id: "user_admin" as never,
  _creationTime: Date.now(),
  email: "admin@example.com",
  name: "Alex Admin",
  role: "admin" as const,
  createdBy: null,
  createdAt: Date.now(),
};

const secondUser = {
  _id: "user_member" as never,
  _creationTime: Date.now(),
  email: "member@example.com",
  name: "Morgan Member",
  role: "user" as const,
  createdBy: "user_admin" as never,
  createdAt: Date.now(),
};

describe("UserManagementSection", () => {
  beforeEach(() => {
    createUserMock.mockReset();
    updateUserRoleMock.mockReset();
    changePasswordMock.mockReset();
    mockUseQuery.mockReset();
    mockUseAction.mockReset();
    mockUseMutation.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();

    mockUseQuery.mockReturnValue([adminUser, secondUser]);

    mockUseAction.mockReturnValue(createUserMock);

    mockUseMutation.mockReturnValue(updateUserRoleMock);
  });

  it("renders user list and opens the Add User dialog", async () => {
    const user = userEvent.setup();
    render(<UserManagementSection currentUserId={adminUser._id} />);

    expect(screen.getByText("Alex Admin")).toBeInTheDocument();
    expect(screen.getByText("Morgan Member")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add user/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Temporary password")).toBeInTheDocument();
  });

  it("renders role select comboboxes for each user", () => {
    render(<UserManagementSection currentUserId={adminUser._id} />);

    expect(
      screen.getByRole("combobox", { name: "Role for Alex Admin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Role for Morgan Member" }),
    ).toBeInTheDocument();
  });

  it("renders role select in create user dialog", async () => {
    const user = userEvent.setup();
    render(<UserManagementSection currentUserId={adminUser._id} />);

    await user.click(screen.getByRole("button", { name: /add user/i }));

    // Dialog should have the role combobox (3rd combobox after the 2 in the table)
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
  });

  it("renders save buttons for each user row", () => {
    render(<UserManagementSection currentUserId={adminUser._id} />);

    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    expect(saveButtons).toHaveLength(2);
  });
});

describe("SettingsPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseAction.mockReset();
    mockUseMutation.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    mockUseAction.mockReturnValue(changePasswordMock);
    mockUseMutation.mockReturnValue(updateUserRoleMock);
  });

  it("shows reduced settings for non-admin users", () => {
    mockUseQuery.mockReturnValue({ ...secondUser, role: "user" as const });

    render(<SettingsPageClient />);

    expect(
      screen.getByText(
        "Only admins can manage date format, features, and users.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add user/i }),
    ).not.toBeInTheDocument();
  });
});
