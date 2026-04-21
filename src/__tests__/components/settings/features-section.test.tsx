import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getAppSettingsMock = vi.fn();

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => getAppSettingsMock(),
  setServiceSchedulingEnabled: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { FeaturesSection } from "@/components/settings/features-section";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("FeaturesSection", () => {
  beforeEach(() => {
    getAppSettingsMock.mockReset();
  });

  it("renders heading and toggle when settings are loaded", async () => {
    getAppSettingsMock.mockResolvedValue({
      serviceSchedulingEnabled: true,
      dateFormat: "DD-MM-YYYY",
      updatedAt: null,
    });

    renderWithClient(<FeaturesSection />);

    expect(
      screen.getByRole("heading", { name: "Features" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText("Preventive service scheduling"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("switch", { name: "Toggle service scheduling" }),
    ).toBeInTheDocument();
  });

  it("shows loading state when settings are pending", () => {
    getAppSettingsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<FeaturesSection />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders switch in checked state when scheduling is enabled", async () => {
    getAppSettingsMock.mockResolvedValue({
      serviceSchedulingEnabled: true,
      dateFormat: "DD-MM-YYYY",
      updatedAt: null,
    });

    renderWithClient(<FeaturesSection />);

    const toggle = await screen.findByRole("switch", {
      name: "Toggle service scheduling",
    });
    expect(toggle).toHaveAttribute("data-state", "checked");
  });
});
