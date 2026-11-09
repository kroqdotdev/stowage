import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceSpy = vi.fn();
const logoutSpy = vi.fn();
const setThemeSpy = vi.fn();
const toastErrorSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceSpy }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: setThemeSpy }),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () =>
    Promise.resolve({
      id: "u1",
      email: "alex@example.com",
      name: "Alex Admin",
      role: "admin",
    }),
  logout: () => logoutSpy(),
}));

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorSpy(...args) },
}));

import { UserMenu } from "@/components/layout/user-menu";

function renderMenu() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <UserMenu />
    </QueryClientProvider>,
  );
}

async function openMenu() {
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: "Open user menu" });
  await waitFor(() => expect(trigger).toBeEnabled());
  await user.click(trigger);
  return user;
}

describe("UserMenu", () => {
  beforeEach(() => {
    replaceSpy.mockReset();
    logoutSpy.mockReset();
    setThemeSpy.mockReset();
    toastErrorSpy.mockReset();
  });

  it("shows the signed-in user's name and role on the trigger", async () => {
    renderMenu();
    expect(await screen.findByText("Alex Admin")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("opens with the email, appearance options and sign out", async () => {
    renderMenu();
    const user = await openMenu();

    expect(await screen.findByText("alex@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Dark" }));
    expect(setThemeSpy).toHaveBeenCalledWith("dark");
  });

  it("signs out and redirects to login", async () => {
    logoutSpy.mockResolvedValue(undefined);
    renderMenu();
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledOnce();
      expect(replaceSpy).toHaveBeenCalledWith("/login");
    });
  });

  it("keeps the user signed in when logout rejects", async () => {
    logoutSpy.mockRejectedValue(new Error("network"));
    renderMenu();
    const user = await openMenu();

    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledOnce();
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Could not sign out. Please try again.",
      );
    });
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
