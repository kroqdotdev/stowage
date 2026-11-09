import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ElementProperties } from "@/components/labels/element-properties";
import type { EditableLabelTemplate } from "@/components/labels/types";

function renderProps(
  template: Partial<EditableLabelTemplate>,
  onDeleteTemplate = vi.fn(),
) {
  render(
    <ElementProperties
      template={{
        id: "t1",
        name: "Thermal",
        widthMm: 57,
        heightMm: 32,
        elements: [],
        isDefault: false,
        ...template,
      }}
      selectedElement={null}
      fieldDefinitions={[]}
      canEdit
      dirty={false}
      saving={false}
      deleting={false}
      onTemplateChange={vi.fn()}
      onSelectPreset={vi.fn()}
      onChangeElement={vi.fn()}
      onDeleteElement={vi.fn()}
      onDeleteTemplate={onDeleteTemplate}
      onSave={vi.fn()}
    />,
  );
  return onDeleteTemplate;
}

describe("ElementProperties template footer", () => {
  it("offers a named delete button for a non-default template", () => {
    const onDelete = renderProps({ isDefault: false });
    fireEvent.click(screen.getByRole("button", { name: "Delete template…" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("says in visible text that the default template can't be deleted", () => {
    renderProps({ isDefault: true });
    expect(
      screen.queryByRole("button", { name: "Delete template…" }),
    ).toBeNull();
    expect(
      screen.getByText("Default template, can't be deleted"),
    ).toBeVisible();
  });
});
