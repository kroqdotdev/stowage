import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Package } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

describe("StatCard", () => {
  it("renders the label and count", () => {
    render(
      <StatCard
        label="Total assets"
        value={42}
        icon={Package}
        className="bg-card"
        statKey="total"
      />,
    );

    expect(screen.getByText("Total assets")).toBeVisible();
    expect(screen.getByText("42")).toBeVisible();
  });

  it("renders zero values", () => {
    render(
      <StatCard
        label="Disposed"
        value={0}
        icon={Package}
        className="bg-card"
        statKey="disposed"
      />,
    );

    expect(screen.getByText("Disposed")).toBeVisible();
    expect(screen.getByText("0")).toBeVisible();
  });
});
