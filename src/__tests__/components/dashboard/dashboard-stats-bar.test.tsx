import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DashboardStatsBar } from "@/components/dashboard/dashboard-stats-bar";

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

const statusCounts = {
  active: 10,
  in_storage: 5,
  under_repair: 3,
  retired: 2,
  disposed: 1,
};

describe("DashboardStatsBar", () => {
  it("renders five cells: assets, overdue, under repair, in storage, retired", () => {
    render(
      <DashboardStatsBar
        totalAssets={21}
        statusCounts={statusCounts}
        overdueCount={4}
      />,
    );

    const bar = screen.getByTestId("dashboard-stats-bar");
    const links = within(bar).getAllByRole("link");
    expect(links).toHaveLength(5);

    const expected: Array<[RegExp, string, string]> = [
      [/Assets/, "21", "/assets"],
      [/Overdue/, "4", "/services"],
      [/Under repair/, "3", "/assets?status=under_repair"],
      [/In storage/, "5", "/assets?status=in_storage"],
      [/Retired/, "2", "/assets?status=retired"],
    ];
    expected.forEach(([name, value, href], index) => {
      const link = links[index];
      expect(link).toHaveAccessibleName(name);
      expect(link).toHaveAttribute("href", href);
      expect(within(link).getByText(value)).toBeInTheDocument();
    });
  });

  it("does not show active or disposed counts", () => {
    render(
      <DashboardStatsBar
        totalAssets={21}
        statusCounts={statusCounts}
        overdueCount={4}
      />,
    );

    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Disposed")).not.toBeInTheDocument();
  });

  it("keeps short phone labels next to the full labels", () => {
    render(
      <DashboardStatsBar
        totalAssets={21}
        statusCounts={statusCounts}
        overdueCount={0}
      />,
    );

    expect(screen.getByText("In repair")).toBeInTheDocument();
    expect(screen.getByText("Stored")).toBeInTheDocument();
  });

  it("renders zero counts", () => {
    render(
      <DashboardStatsBar
        totalAssets={0}
        statusCounts={{
          active: 0,
          in_storage: 0,
          under_repair: 0,
          retired: 0,
          disposed: 0,
        }}
        overdueCount={0}
      />,
    );

    expect(screen.getAllByText("0")).toHaveLength(5);
  });
});
