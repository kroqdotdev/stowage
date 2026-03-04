import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.fn();
const signInMock = vi.fn();
const createFirstAdminMock = vi.fn();

const authState = {
  isAuthenticated: false,
  isLoading: false,
};

let firstRunValue: boolean | undefined = true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: signInMock, signOut: vi.fn() }),
  useAuthToken: () => null,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => authState,
  useQuery: () => firstRunValue,
  useAction: () => createFirstAdminMock,
}));

import { SetupForm } from "@/components/auth/setup-form";

describe("SetupForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    signInMock.mockReset();
    createFirstAdminMock.mockReset();
    authState.isAuthenticated = false;
    authState.isLoading = false;
    firstRunValue = true;
  });

  it("renders all setup fields", () => {
    render(<SetupForm />);

    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create admin account" }),
    ).toBeInTheDocument();
  });

  it("validates password mismatch before submitting", async () => {
    const user = userEvent.setup();
    render(<SetupForm />);

    await user.type(screen.getByLabelText("Full name"), "Alex Admin");
    await user.type(screen.getByLabelText("Email"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password456");
    await user.click(
      screen.getByRole("button", { name: "Create admin account" }),
    );

    expect(createFirstAdminMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
  });

  it("redirects to login if setup is already complete", () => {
    firstRunValue = false;
    render(<SetupForm />);

    expect(replaceMock).toHaveBeenCalledWith("/login");
  });
});
