import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { DynamicFieldDisplay } from "@/components/fields/dynamic-field-display"
import type { FieldDefinition } from "@/components/fields/types"

function definition(fieldType: FieldDefinition["fieldType"]) {
  return { fieldType } as Pick<FieldDefinition, "fieldType">
}

describe("DynamicFieldDisplay", () => {
  it("renders text and number values", () => {
    const { rerender } = render(
      <DynamicFieldDisplay definition={definition("text")} value="Desk A-12" />,
    )
    expect(screen.getByText("Desk A-12")).toBeInTheDocument()

    rerender(<DynamicFieldDisplay definition={definition("number")} value={42} />)
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("formats date values based on selected format", () => {
    const { rerender } = render(
      <DynamicFieldDisplay
        definition={definition("date")}
        value="2026-02-27"
        dateFormat="DD-MM-YYYY"
      />,
    )
    expect(screen.getByText("27-02-2026")).toBeInTheDocument()

    rerender(
      <DynamicFieldDisplay
        definition={definition("date")}
        value="2026-02-27"
        dateFormat="MM-DD-YYYY"
      />,
    )
    expect(screen.getByText("02-27-2026")).toBeInTheDocument()

    rerender(
      <DynamicFieldDisplay
        definition={definition("date")}
        value="2026-02-27"
        dateFormat="YYYY-MM-DD"
      />,
    )
    expect(screen.getByText("2026-02-27")).toBeInTheDocument()
  })

  it("renders booleans as Yes/No", () => {
    const { rerender } = render(
      <DynamicFieldDisplay definition={definition("checkbox")} value={true} />,
    )
    expect(screen.getByText("Yes")).toBeInTheDocument()

    rerender(<DynamicFieldDisplay definition={definition("checkbox")} value={false} />)
    expect(screen.getByText("No")).toBeInTheDocument()
  })

  it("renders URL values as links", () => {
    render(
      <DynamicFieldDisplay
        definition={definition("url")}
        value="https://example.com/manual"
      />,
    )

    const link = screen.getByRole("link", { name: "https://example.com/manual" })
    expect(link).toHaveAttribute("href", "https://example.com/manual")
  })

  it("formats currency values", () => {
    render(
      <DynamicFieldDisplay definition={definition("currency")} value={1234.5} />,
    )

    expect(screen.getByText(/\$1,234\.50/)).toBeInTheDocument()
  })

  it("renders placeholder for null and undefined", () => {
    const { rerender } = render(
      <DynamicFieldDisplay definition={definition("text")} value={null} />,
    )
    expect(screen.getByText("—")).toBeInTheDocument()

    rerender(<DynamicFieldDisplay definition={definition("text")} value={undefined} />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })
})
