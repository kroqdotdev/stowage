import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const loginMock = vi.fn();
const checkFirstRunMock = vi.fn();
const useCurrentUserHookMock = vi.fn();

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

vi.mock("@/hooks/use-current-user", () => ({
  CURRENT_USER_QUERY_KEY: ["auth", "me"],
  useCurrentUser: () => useCurrentUserHookMock(),
}));

vi.mock("@/lib/api/auth", () => ({
  login: (input: unknown) => loginMock(input),
  checkFirstRun: () => checkFirstRunMock(),
}));

import { LoginForm } from "@/components/auth/login-form";

function renderWithClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <LoginForm />
      </QueryClientProvider>,
    ),
  };
}

describe("LoginForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    loginMock.mockReset();
    checkFirstRunMock.mockReset();
    useCurrentUserHookMock.mockReset();
    useCurrentUserHookMock.mockReturnValue({
      data: null,
      isLoading: false,
    });
    checkFirstRunMock.mockResolvedValue(false);
  });

  it("renders email/password fields and submit button", async () => {
    renderWithClient();
    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows error on invalid credentials", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new Error("Invalid email or password"));

    renderWithClient();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "bad-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(loginMock).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "bad-password",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
  });

  it("redirects to /dashboard on successful login", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce({
      id: "u1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    });

    renderWithClient();

    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to /dashboard when already signed in", async () => {
    useCurrentUserHookMock.mockReturnValue({
      data: {
        id: "u1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
      },
      isLoading: false,
    });
    renderWithClient();
    await vi.waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard");
    });
  });
});
