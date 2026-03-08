import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetServiceRecordsPanel } from "@/components/services/asset-service-records-panel";

vi.mock("@/components/services/service-history", () => ({
  ServiceHistory: ({ assetId }: { assetId: string }) => (
    <div>ServiceHistory {assetId}</div>
  ),
}));

describe("AssetServiceRecordsPanel", () => {
  it("renders ServiceHistory with the given assetId", () => {
    render(<AssetServiceRecordsPanel assetId={"asset1" as never} />);

    expect(screen.getByText("ServiceHistory asset1")).toBeInTheDocument();
  });
});
