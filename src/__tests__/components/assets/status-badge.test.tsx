import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/assets/status-badge";

describe("StatusBadge", () => {
  it("renders human-readable status labels", () => {
    render(<StatusBadge status="under_repair" />);
    expect(screen.getByText("Under repair")).toBeInTheDocument();
  });

  it("renders each status variant without crashing", () => {
    const { rerender } = render(<StatusBadge status="active" />);

    rerender(<StatusBadge status="in_storage" />);
    expect(screen.getByText("In storage")).toBeInTheDocument();

    rerender(<StatusBadge status="retired" />);
    expect(screen.getByText("Retired")).toBeInTheDocument();

    rerender(<StatusBadge status="disposed" />);
    expect(screen.getByText("Disposed")).toBeInTheDocument();
  });
});
