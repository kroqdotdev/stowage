import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceRecordDynamicForm } from "@/components/services/service-record-dynamic-form";

vi.mock("@/components/services/service-record-form", () => ({
  ServiceRecordForm: ({ assetId }: { assetId: string }) => (
    <div>Unified form for {assetId}</div>
  ),
}));

describe("ServiceRecordDynamicForm", () => {
  it("renders the unified service record form", () => {
    render(<ServiceRecordDynamicForm assetId={"asset1" as never} />);

    expect(screen.getByText("Unified form for asset1")).toBeInTheDocument();
  });
});
