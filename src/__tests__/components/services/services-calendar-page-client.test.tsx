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

vi.mock("@/components/services/services-calendar-month", () => ({
  ServicesCalendarMonth: () => <div>CalendarMonth</div>,
}));

import { ServicesCalendarPageClient } from "@/components/services/services-calendar-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServicesCalendarPageClient", () => {
  beforeEach(() => {
    getAppSettingsMock.mockReset();
  });

  it("shows loading state when appSettings is pending", () => {
    getAppSettingsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ServicesCalendarPageClient />);

    expect(screen.getByText("Loading service calendar...")).toBeInTheDocument();
  });

  it("renders calendar view when service scheduling is enabled", async () => {
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });

    renderWithClient(<ServicesCalendarPageClient />);

    await waitFor(() => {
      expect(screen.getByText("CalendarMonth")).toBeInTheDocument();
    });
    expect(screen.getByText("NavTabs")).toBeInTheDocument();
  });

  it("shows disabled message when service scheduling is off", async () => {
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: false,
      updatedAt: null,
    });

    renderWithClient(<ServicesCalendarPageClient />);

    await waitFor(() => {
      expect(
        screen.getByText(/Service scheduling is disabled/),
      ).toBeInTheDocument();
    });
  });
});
