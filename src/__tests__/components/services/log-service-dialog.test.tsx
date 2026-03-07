import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LogServiceDialog } from "@/components/services/log-service-dialog";

vi.mock("@/components/services/service-record-form", () => ({
  ServiceRecordForm: ({
    assetId,
    scheduleId,
    mode,
  }: {
    assetId: string;
    scheduleId: string;
    mode: string;
  }) => (
    <div>
      Form {mode} {assetId} {scheduleId}
    </div>
  ),
}));

describe("LogServiceDialog", () => {
  it("renders the completion form when open", () => {
    render(
      <LogServiceDialog
        open
        assetId={"asset1" as never}
        assetName="Main Engine"
        scheduleId={"schedule1" as never}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Log service: Main Engine" }),
    ).toBeVisible();
    expect(screen.getByText("Form complete asset1 schedule1")).toBeVisible();
  });

  it("does not render form content when closed", () => {
    render(
      <LogServiceDialog
        open={false}
        assetId={"asset1" as never}
        assetName="Main Engine"
        scheduleId={"schedule1" as never}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.queryByText("Form complete asset1 schedule1"),
    ).not.toBeInTheDocument();
  });
});
