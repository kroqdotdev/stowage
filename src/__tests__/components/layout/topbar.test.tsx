import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock use-mobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { Topbar } from "@/components/layout/topbar";

function renderWithProviders() {
  return render(
    <SidebarProvider>
      <Topbar />
    </SidebarProvider>,
  );
}

describe("Topbar", () => {
  it("renders the search input placeholder", () => {
    renderWithProviders();
    const inputs = screen.getAllByPlaceholderText("Search assets...");
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the theme toggle button", () => {
    renderWithProviders();
    const toggles = screen.getAllByText("Toggle theme");
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the user menu button", () => {
    renderWithProviders();
    const menus = screen.getAllByText("User menu");
    expect(menus.length).toBeGreaterThanOrEqual(1);
  });

  it("search input is disabled (placeholder for now)", () => {
    renderWithProviders();
    const inputs = screen.getAllByPlaceholderText("Search assets...");
    expect(inputs[0]).toBeDisabled();
  });
});
