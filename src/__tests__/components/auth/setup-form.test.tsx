import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
const checkFirstRunMock = vi.fn();
const createFirstAdminMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/api/auth", () => ({
  checkFirstRun: () => checkFirstRunMock(),
  createFirstAdmin: (input: unknown) => createFirstAdminMock(input),
}));

import { SetupForm } from "@/components/auth/setup-form";

function renderWithClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <SetupForm />
      </QueryClientProvider>,
    ),
  };
}

describe("SetupForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    checkFirstRunMock.mockReset();
    createFirstAdminMock.mockReset();
    checkFirstRunMock.mockResolvedValue(true);
  });

  it("renders all setup fields", async () => {
    renderWithClient();
    expect(await screen.findByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create admin account" }),
    ).toBeInTheDocument();
  });

  it("validates password mismatch before submitting", async () => {
    const user = userEvent.setup();
    renderWithClient();
    await screen.findByLabelText("Full name");

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

  it("redirects to login if setup is already complete", async () => {
    checkFirstRunMock.mockResolvedValue(false);
    renderWithClient();
    await screen.findByRole("button", { name: "Create admin account" });
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });
});
