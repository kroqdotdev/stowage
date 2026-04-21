import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardStatsBar } from "@/components/dashboard/dashboard-stats-bar";

const statusCounts = {
  active: 10,
  in_storage: 5,
  under_repair: 3,
  retired: 2,
  disposed: 1,
};

describe("DashboardStatsBar", () => {
  it("renders all 6 stat cards with correct labels and values", () => {
    render(<DashboardStatsBar totalAssets={21} statusCounts={statusCounts} />);

    expect(screen.getByText("Total Assets")).toBeVisible();
    expect(screen.getByText("21")).toBeVisible();

    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.getByText("10")).toBeVisible();

    expect(screen.getByText("In Storage")).toBeVisible();
    expect(screen.getByText("5")).toBeVisible();

    expect(screen.getByText("Under Repair")).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();

    expect(screen.getByText("Retired")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();

    expect(screen.getByText("Disposed")).toBeVisible();
    expect(screen.getByText("1")).toBeVisible();
  });

  it("renders zero counts correctly", () => {
    const zeroCounts = {
      active: 0,
      in_storage: 0,
      under_repair: 0,
      retired: 0,
      disposed: 0,
    };

    render(<DashboardStatsBar totalAssets={0} statusCounts={zeroCounts} />);

    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(6);
  });

  it("renders data-dashboard-stat attributes for each card", () => {
    render(<DashboardStatsBar totalAssets={21} statusCounts={statusCounts} />);

    const keys = [
      "total",
      "active",
      "in_storage",
      "under_repair",
      "retired",
      "disposed",
    ];
    for (const key of keys) {
      expect(
        document.querySelector(`[data-dashboard-stat="${key}"]`),
      ).toBeTruthy();
    }
  });

  it("is horizontally scrollable on mobile and a grid from sm up", () => {
    render(<DashboardStatsBar totalAssets={21} statusCounts={statusCounts} />);
    const bar = screen.getByTestId("dashboard-stats-bar");
    expect(bar.className).toMatch(/overflow-x-auto/);
    expect(bar.className).toMatch(/sm:grid/);
  });
});
