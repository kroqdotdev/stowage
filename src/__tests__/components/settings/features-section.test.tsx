import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { FeaturesSection } from "@/components/settings/features-section";

describe("FeaturesSection", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("renders heading and toggle when settings are loaded", () => {
    mockUseQuery.mockReturnValue({
      serviceSchedulingEnabled: true,
      dateFormat: "DD-MM-YYYY",
      updatedAt: null,
    });

    render(<FeaturesSection />);

    expect(
      screen.getByRole("heading", { name: "Features" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Preventive service scheduling"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Toggle service scheduling" }),
    ).toBeInTheDocument();
  });

  it("shows loading state when settings are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<FeaturesSection />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders switch in checked state when scheduling is enabled", () => {
    mockUseQuery.mockReturnValue({
      serviceSchedulingEnabled: true,
      dateFormat: "DD-MM-YYYY",
      updatedAt: null,
    });

    render(<FeaturesSection />);

    const toggle = screen.getByRole("switch", {
      name: "Toggle service scheduling",
    });
    expect(toggle).toHaveAttribute("data-state", "checked");
  });
});
