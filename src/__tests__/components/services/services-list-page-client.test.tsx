import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getAppSettingsMock = vi.fn();

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => getAppSettingsMock(),
}));

vi.mock("@/components/services/services-nav-tabs", () => ({
  ServicesNavTabs: () => <div>NavTabs</div>,
}));

vi.mock("@/components/services/services-scheduled-list", () => ({
  ServicesScheduledList: () => <div>ScheduledList</div>,
}));

import { ServicesListPageClient } from "@/components/services/services-list-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServicesListPageClient", () => {
  beforeEach(() => {
    getAppSettingsMock.mockReset();
  });

  it("shows loading state when appSettings is pending", () => {
    getAppSettingsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ServicesListPageClient />);

    expect(screen.getByText("Loading services planner...")).toBeInTheDocument();
  });

  it("renders scheduled list when service scheduling is enabled", async () => {
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });

    renderWithClient(<ServicesListPageClient />);

    await waitFor(() => {
      expect(screen.getByText("ScheduledList")).toBeInTheDocument();
    });
    expect(screen.getByText("NavTabs")).toBeInTheDocument();
  });

  it("shows disabled message when service scheduling is off", async () => {
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: false,
      updatedAt: null,
    });

    renderWithClient(<ServicesListPageClient />);

    await waitFor(() => {
      expect(
        screen.getByText(/Service scheduling is disabled/),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("NavTabs")).toBeInTheDocument();
  });
});
