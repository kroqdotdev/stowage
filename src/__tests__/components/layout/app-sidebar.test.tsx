import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock use-mobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

function renderWithProviders() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  );
}

describe("AppSidebar", () => {
  it("renders the Stowage brand name", () => {
    renderWithProviders();
    // SidebarProvider renders desktop + mobile, so brand may appear multiple times
    const brands = screen.getAllByText("Stowage");
    expect(brands.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all navigation links", () => {
    renderWithProviders();
    const expectedItems = [
      "Dashboard",
      "Assets",
      "Locations",
      "Categories",
      "Tags",
      "Fields",
      "Services",
      "Labels",
      "Settings",
    ];
    for (const item of expectedItems) {
      const elements = screen.getAllByText(item);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders navigation links with correct hrefs", () => {
    renderWithProviders();
    const links: Record<string, string> = {
      Dashboard: "/dashboard",
      Assets: "/assets",
      Locations: "/locations",
      Categories: "/categories",
      Tags: "/tags",
      Fields: "/fields",
      Services: "/services",
      Labels: "/labels",
      Settings: "/settings",
    };
    for (const [name, href] of Object.entries(links)) {
      const elements = screen.getAllByText(name);
      const link = elements[0].closest("a");
      expect(link).toHaveAttribute("href", href);
    }
  });
});
