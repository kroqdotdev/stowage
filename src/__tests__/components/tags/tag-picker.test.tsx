import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TagPicker } from "@/components/tags/tag-picker";

const options = [
  { id: "tag1", name: "Fragile", color: "#DC2626" },
  { id: "tag2", name: "Heavy", color: "#0891B2" },
  { id: "tag3", name: "Expensive", color: "#9333EA" },
];

describe("TagPicker", () => {
  it("renders available tag options", () => {
    render(
      <TagPicker value={[]} options={options} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Fragile")).toBeInTheDocument();
    expect(screen.getByText("Heavy")).toBeInTheDocument();
    expect(screen.getByText("Expensive")).toBeInTheDocument();
  });

  it("shows empty message when no tags defined", () => {
    render(
      <TagPicker value={[]} options={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText("No tags defined.")).toBeInTheDocument();
  });

  it("renders selected tag badges", () => {
    render(
      <TagPicker
        value={["tag1", "tag3"]}
        options={options}
        onChange={vi.fn()}
      />,
    );

    const fragileElements = screen.getAllByText("Fragile");
    expect(fragileElements.length).toBeGreaterThanOrEqual(2);
    const expensiveElements = screen.getAllByText("Expensive");
    expect(expensiveElements.length).toBeGreaterThanOrEqual(2);
  });
});
