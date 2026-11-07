import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  it("renders the Service due heading", () => {
    render(
      <UpcomingServicesWidget
        items={items}
        overdueCount={1}
        serviceSchedulingEnabled={true}
        dateFormat="DD-MM-YYYY"
      />,
    );

    expect(
      screen.getByRole("region", { name: "Service due" }),
    ).toBeInTheDocument();
  });

  it("links each row to the asset with tag, date and due marker", () => {
    render(
      <UpcomingServicesWidget
        items={items}
        overdueCount={1}
        serviceSchedulingEnabled={true}
        dateFormat="DD-MM-YYYY"
      />,
    );

    const forklift = screen.getByRole("link", { name: /Forklift A/ });
    expect(forklift).toHaveAttribute("href", "/assets/asset1");
    expect(within(forklift).getByText("FK-001")).toBeInTheDocument();
    expect(within(forklift).getByText("05-03-2026")).toBeInTheDocument();
    expect(within(forklift).getByText("Overdue 2 days")).toBeInTheDocument();
    expect(within(forklift).getByText("Overdue 2d")).toBeInTheDocument();

    const generator = screen.getByRole("link", { name: /Generator B/ });
    expect(generator).toHaveAttribute("href", "/assets/asset2");
    expect(within(generator).getByText("GN-002")).toBeInTheDocument();
    expect(within(generator).getByText("10-03-2026")).toBeInTheDocument();
    expect(within(generator).getByText("In 3 days")).toBeInTheDocument();
  });

  it("closes the list with overdue and more-scheduled counts and a services link", () => {
    render(
      <UpcomingServicesWidget
        items={items}
        overdueCount={3}
        scheduledCount={6}
        serviceSchedulingEnabled={true}
        dateFormat="DD-MM-YYYY"
      />,
    );

    expect(screen.getByText(/3 overdue/)).toBeInTheDocument();
    expect(screen.getByText(/4 more scheduled/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See all services" }),
    ).toHaveAttribute("href", "/services");
  });

  it("omits the overdue and more counts when there are none", () => {
    render(
      <UpcomingServicesWidget
        items={items}
        overdueCount={0}
        serviceSchedulingEnabled={true}
        dateFormat="DD-MM-YYYY"
      />,
    );

    expect(screen.queryByText(/overdue ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/more scheduled/)).not.toBeInTheDocument();
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
