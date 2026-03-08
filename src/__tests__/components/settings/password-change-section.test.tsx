import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseAction = vi.fn();

vi.mock("convex/react", () => ({
  useAction: (...args: unknown[]) => mockUseAction(...args),
}));

import { PasswordChangeSection } from "@/components/settings/password-change-section";

describe("PasswordChangeSection", () => {
  beforeEach(() => {
    mockUseAction.mockReset();
    mockUseAction.mockReturnValue(vi.fn());
  });

  it("renders password form fields", () => {
    render(<PasswordChangeSection />);

    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeInTheDocument();
  });

  it("shows error when new password is too short", async () => {
    const user = userEvent.setup();

    render(<PasswordChangeSection />);

    await user.type(screen.getByLabelText("Current password"), "oldpass");
    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(
      screen.getByRole("button", { name: "Update password" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "New password must be at least 8 characters",
    );
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();

    render(<PasswordChangeSection />);

    await user.type(screen.getByLabelText("Current password"), "oldpassword");
    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "newpassword2",
    );
    await user.click(
      screen.getByRole("button", { name: "Update password" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "New passwords do not match",
    );
  });
});
