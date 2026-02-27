import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DynamicField } from "@/components/fields/dynamic-field"
import type { FieldDefinition } from "@/components/fields/types"

function createDefinition(
  overrides: Partial<FieldDefinition>,
): Pick<FieldDefinition, "name" | "fieldType" | "options" | "required"> {
  return {
    name: "Test field",
    fieldType: "text",
    options: [],
    required: false,
    ...overrides,
  }
}

describe("DynamicField", () => {
  it("renders text input and emits string changes", () => {
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({ name: "Notes", fieldType: "text" })}
        value=""
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText("Notes")
    fireEvent.change(input, { target: { value: "Office shelf" } })

    expect(onChange).toHaveBeenCalledWith("Office shelf")
  })

  it("renders number input and emits numeric values", () => {
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({ name: "Weight", fieldType: "number" })}
        value={null}
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText("Weight")
    fireEvent.change(input, { target: { value: "42" } })

    expect(onChange).toHaveBeenCalledWith(42)
  })

  it("renders date input and emits canonical date values", () => {
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({ name: "Purchase date", fieldType: "date" })}
        value={null}
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText("Purchase date")
    fireEvent.change(input, { target: { value: "2026-02-27" } })

    expect(onChange).toHaveBeenCalledWith("2026-02-27")
  })

  it("renders dropdown and emits selected option", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({
          name: "Condition",
          fieldType: "dropdown",
          options: ["New", "Used"],
        })}
        value={null}
        onChange={onChange}
      />,
    )

    await user.selectOptions(screen.getByLabelText("Condition"), "Used")

    expect(onChange).toHaveBeenCalledWith("Used")
  })

  it("renders checkbox and emits boolean values", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({ name: "Archived", fieldType: "checkbox" })}
        value={false}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByLabelText("Archived"))

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("renders URL input and shows validation feedback", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({ name: "Manual URL", fieldType: "url" })}
        value=""
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText("Manual URL")
    await user.type(input, "invalid-url")

    expect(onChange).toHaveBeenCalled()
    expect(screen.getByText("Enter a valid URL")).toBeInTheDocument()
  })

  it("renders currency input with prefix and emits numeric values", () => {
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({ name: "Price", fieldType: "currency" })}
        value={null}
        onChange={onChange}
      />,
    )

    const input = screen.getByLabelText("Price")
    fireEvent.change(input, { target: { value: "199.99" } })

    expect(onChange).toHaveBeenCalledWith(199.99)
    expect(screen.getByText("$")).toBeInTheDocument()
  })

  it("handles undefined/null values without crashing", () => {
    const onChange = vi.fn()
    render(
      <DynamicField
        definition={createDefinition({ name: "Notes", fieldType: "text" })}
        value={undefined}
        onChange={onChange}
      />,
    )

    expect(screen.getByLabelText("Notes")).toBeInTheDocument()
  })
})
