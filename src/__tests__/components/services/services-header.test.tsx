import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

const listScheduledAssetsMock = vi.fn();
const pathnameMock = vi.fn(() => "/services");

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

vi.mock("@/lib/api/service-schedules", () => ({
  listScheduledAssets: () => listScheduledAssetsMock(),
}));

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => Promise.resolve({ serviceSchedulingEnabled: true }),
}));

vi.mock("@/lib/use-today-iso-date", () => ({
  useTodayIsoDate: () => "2026-03-01",
}));

import { ServicesHeader } from "@/components/services/services-header";

function row(id: string, nextServiceDate: string, reminderStartDate: string) {
  return {
    scheduleId: id,
    assetId: `asset-${id}`,
    assetName: `Asset ${id}`,
    assetTag: `T-${id}`,
    assetStatus: "active",
    nextServiceDate,
    intervalValue: 1,
    intervalUnit: "months",
    reminderLeadValue: 1,
    reminderLeadUnit: "days",
    reminderStartDate,
    lastServiceDate: null,
    lastServiceDescription: null,
    lastServiceProviderName: null,
  };
}

function renderHeader() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ServicesHeader />
    </QueryClientProvider>,
  );
}

describe("ServicesHeader", () => {
  beforeEach(() => {
    listScheduledAssetsMock.mockReset();
    pathnameMock.mockReturnValue("/services");
  });

  it("counts due this week with the same buckets as the schedule list", async () => {
    listScheduledAssetsMock.mockResolvedValue([
      // overdue
      row("a", "2026-02-20", "2026-02-19"),
      // due in 3 days, reminder already started: this week
      row("b", "2026-03-04", "2026-02-25"),
      // due in 5 days, reminder starts tomorrow: Later, not this week
      row("c", "2026-03-06", "2026-03-05"),
      // due in 20 days: this month
      row("d", "2026-03-21", "2026-02-21"),
    ]);

    renderHeader();

    expect(
      await screen.findByText("1 overdue · 1 due this week · 4 scheduled"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Services4",
    );
  });

  it("leaves the count off the title outside the schedule views", async () => {
    pathnameMock.mockReturnValue("/services/providers");
    listScheduledAssetsMock.mockResolvedValue([
      row("a", "2026-03-04", "2026-02-25"),
    ]);

    renderHeader();

    expect(
      await screen.findByText("1 due this week · 1 scheduled"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /^Services$/,
    );
  });
});
