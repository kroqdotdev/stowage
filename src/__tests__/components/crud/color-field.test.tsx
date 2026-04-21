import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorField, PRESET_COLORS } from "@/components/crud/color-field";

describe("ColorField", () => {
  it("renders label, input with initial value, and preset swatches", () => {
    render(<ColorField id="test-color" value="#EA580C" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Color")).toBeInTheDocument();
    expect(screen.getByDisplayValue("#EA580C")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Preset colors" }),
    ).toBeInTheDocument();

    const swatches = screen.getAllByRole("listitem");
    expect(swatches).toHaveLength(PRESET_COLORS.length);
  });

  it("calls onChange when a preset swatch is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ColorField id="test-color" value="#EA580C" onChange={onChange} />);

    await user.click(
      screen.getByRole("listitem", { name: `Select ${PRESET_COLORS[3]}` }),
    );
    expect(onChange).toHaveBeenCalledWith(PRESET_COLORS[3]);
  });

  it("renders custom label", () => {
    render(
      <ColorField
        id="cat-color"
        value="#000000"
        onChange={vi.fn()}
        label="Category color"
      />,
    );

    expect(screen.getByLabelText("Category color")).toBeInTheDocument();
  });
});
