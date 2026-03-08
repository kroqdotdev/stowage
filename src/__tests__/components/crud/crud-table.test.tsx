import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CrudTable } from "@/components/crud/crud-table";

const headers = [
  { key: "name", label: "Name" },
  { key: "actions", label: "Actions", align: "right" as const },
];

describe("CrudTable", () => {
  it("renders column headers and children rows", () => {
    render(
      <CrudTable
        headers={headers}
        emptyMessage="Nothing here"
        loading={false}
        colSpan={2}
      >
        <tr>
          <td>Row 1</td>
          <td>Edit</td>
        </tr>
      </CrudTable>,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Row 1")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <CrudTable
        headers={headers}
        emptyMessage="Nothing here"
        loading={true}
        colSpan={2}
      >
        {null}
      </CrudTable>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty message when no children", () => {
    render(
      <CrudTable
        headers={headers}
        emptyMessage="Nothing here"
        loading={false}
        colSpan={2}
      >
        {null}
      </CrudTable>,
    );

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
