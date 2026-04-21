import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listCalendarMonthMock = vi.fn();

vi.mock("@/lib/api/service-schedules", () => ({
  listCalendarMonth: (year: number, month: number) =>
    listCalendarMonthMock(year, month),
}));

vi.mock("@/components/services/log-service-dialog", () => ({
  LogServiceDialog: () => null,
}));

import { ServicesCalendarMonth } from "@/components/services/services-calendar-month";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServicesCalendarMonth", () => {
  beforeEach(() => {
    listCalendarMonthMock.mockReset();
  });

  it("renders scheduled items for the current month", async () => {
    const now = new Date();
    const dateKey = `${String(now.getUTCFullYear()).padStart(4, "0")}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

    listCalendarMonthMock.mockResolvedValue([
      {
        scheduleId: "schedule1",
        assetId: "asset1",
        assetName: "Winch",
        assetTag: "WIN-0001",
        nextServiceDate: dateKey,
      },
    ]);

    renderWithClient(<ServicesCalendarMonth />);

    await waitFor(() => {
      expect(screen.getByText("WIN-0001")).toBeInTheDocument();
    });
  });

  it("shows loading state while query is unresolved", () => {
    listCalendarMonthMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ServicesCalendarMonth />);
    expect(screen.getByText("Loading calendar...")).toBeInTheDocument();
  });
});
