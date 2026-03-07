import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.fn();
const signInMock = vi.fn();

const authState = {
  isAuthenticated: false,
  isLoading: false,
};

let firstRunValue: boolean | undefined = false;

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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
}));

import { LoginForm } from "@/components/auth/login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    signInMock.mockReset();
    authState.isAuthenticated = false;
    authState.isLoading = false;
    firstRunValue = false;
  });

  it("renders email/password fields and submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("disables submit while auth state is loading", () => {
    authState.isLoading = true;
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("shows error on invalid credentials", async () => {
    const user = userEvent.setup();
    signInMock.mockRejectedValueOnce(new Error("InvalidSecret"));

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "ADMIN@Example.com");
    await user.type(screen.getByLabelText("Password"), "bad-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signInMock).toHaveBeenCalledWith("password", {
      flow: "signIn",
      email: "admin@example.com",
      password: "bad-password",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
  });

  it("shows invalid credentials when signIn returns no session", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValueOnce({ signingIn: false });

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "bad-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
  });
});
