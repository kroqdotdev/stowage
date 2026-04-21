import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getAppSettingsMock = vi.fn();

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => getAppSettingsMock(),
  setDateFormat: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { RegionalSettingsSection } from "@/components/settings/regional-settings-section";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("RegionalSettingsSection", () => {
  beforeEach(() => {
    getAppSettingsMock.mockReset();
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
  });

  it("renders date format heading and select trigger", async () => {
    renderWithClient(<RegionalSettingsSection />);

    expect(
      screen.getByRole("heading", { name: "Date format" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Save format" }),
    ).toBeInTheDocument();
  });

  it("shows loading state when settings are pending", () => {
    getAppSettingsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<RegionalSettingsSection />);

    expect(screen.getByText("Loading preferences...")).toBeInTheDocument();
  });

  it("shows date preview", async () => {
    renderWithClient(<RegionalSettingsSection />);

    await waitFor(() => {
      expect(screen.getByText("Preview:")).toBeInTheDocument();
    });
    expect(screen.getByText("Using default format.")).toBeInTheDocument();
  });
});
