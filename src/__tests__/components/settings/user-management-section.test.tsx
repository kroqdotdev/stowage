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

  it("submits create user form from dialog", async () => {
    const user = userEvent.setup();
    createUserMock.mockResolvedValueOnce({ userId: "user_new" });

    render(<UserManagementSection currentUserId={adminUser._id} />);

    await user.click(screen.getByRole("button", { name: /add user/i }));
    await user.type(screen.getByLabelText("Full name"), "Taylor New");
    await user.type(screen.getByLabelText("Email"), "taylor@example.com");
    await user.type(screen.getByLabelText("Temporary password"), "password123");
    await user.selectOptions(screen.getByLabelText("Role"), "admin");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(createUserMock).toHaveBeenCalledWith({
      email: "taylor@example.com",
      name: "Taylor New",
      password: "password123",
      role: "admin",
    });
  });

  it("blocks demoting the last admin and shows a toast", async () => {
    const user = userEvent.setup();
    render(<UserManagementSection currentUserId={adminUser._id} />);

    await user.selectOptions(
      screen.getByLabelText("Role for Alex Admin"),
      "user",
    );
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(updateUserRoleMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "You can't remove the last admin. Promote another user to admin first.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
      screen.getByText("Only admins can create users or change roles."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add user/i }),
    ).not.toBeInTheDocument();
  });
});
