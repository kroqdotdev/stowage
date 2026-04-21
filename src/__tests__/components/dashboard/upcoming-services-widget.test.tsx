import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpcomingServicesWidget } from "@/components/dashboard/upcoming-services-widget";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/use-today-iso-date", () => ({
  useTodayIsoDate: () => "2026-03-07",
}));

const items = [
  {
    scheduleId: "sched1" as never,
    assetId: "asset1" as never,
    assetName: "Forklift A",
    assetTag: "FK-001",
    nextServiceDate: "2026-03-05",
  },
  {
    scheduleId: "sched2" as never,
    assetId: "asset2" as never,
    assetName: "Generator B",
    assetTag: "GN-002",
    nextServiceDate: "2026-03-10",
  },
];

describe("UpcomingServicesWidget", () => {
  it("renders items with asset name, tag, and due label", () => {
    render(
      <UpcomingServicesWidget
        items={items}
        overdueCount={1}
        serviceSchedulingEnabled={true}
        dateFormat="DD-MM-YYYY"
      />,
    );

    expect(screen.getByText("Forklift A")).toBeVisible();
    expect(screen.getByText("FK-001")).toBeVisible();
    expect(screen.getByText("2 days overdue")).toBeVisible();

    expect(screen.getByText("Generator B")).toBeVisible();
    expect(screen.getByText("GN-002")).toBeVisible();
    expect(screen.getByText("Due in 3 days")).toBeVisible();
  });

  it("shows overdue badge when overdueCount > 0", () => {
    render(
      <UpcomingServicesWidget
        items={items}
        overdueCount={3}
        serviceSchedulingEnabled={true}
        dateFormat="DD-MM-YYYY"
      />,
    );

    expect(screen.getByText("3 overdue")).toBeVisible();
  });

  it("shows disabled message when service scheduling is off", () => {
    render(
      <UpcomingServicesWidget
        items={[]}
        overdueCount={0}
        serviceSchedulingEnabled={false}
        dateFormat="DD-MM-YYYY"
      />,
    );

    expect(screen.getByText("Service scheduling is disabled.")).toBeVisible();
  });

  it("shows empty state when enabled but no items", () => {
    render(
      <UpcomingServicesWidget
        items={[]}
        overdueCount={0}
        serviceSchedulingEnabled={true}
        dateFormat="DD-MM-YYYY"
      />,
    );

    expect(screen.getByText("No scheduled services yet.")).toBeVisible();
  });
});
