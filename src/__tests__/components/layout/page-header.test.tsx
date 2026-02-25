import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/layout/page-header";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(
      <PageHeader title="Assets" description="Manage your tracked assets." />,
    );
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your tracked assets."),
    ).toBeInTheDocument();
  });

  it("does not render a description when not provided", () => {
    const { container } = render(<PageHeader title="Settings" />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(container.querySelector("p")).toBeNull();
  });
});
