import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BarcodeRenderer } from "@/components/labels/barcode-renderer";

vi.mock("bwip-js/browser", () => ({
  toSVG: vi.fn(
    ({ bcid, text }: { bcid: string; text: string }) =>
      `<svg data-testid="generated-svg" data-bcid="${bcid}" data-text="${text}"></svg>`,
  ),
}));

describe("BarcodeRenderer", () => {
  it("renders SVG output for Code 128", async () => {
    const { container } = render(
      <BarcodeRenderer
        type="code128"
        data="ASSET-001"
        widthMm={30}
        heightMm={10}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    expect(
      container.querySelector('svg[data-bcid="code128"]'),
    ).toBeInTheDocument();
  });

  it("renders SVG output for Data Matrix", async () => {
    const { container } = render(
      <BarcodeRenderer
        type="datamatrix"
        data="https://example.com/assets/123"
        widthMm={14}
        heightMm={14}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    expect(
      container.querySelector('svg[data-bcid="datamatrix"]'),
    ).toBeInTheDocument();
  });

  it("shows a placeholder when no data is provided", () => {
    render(
      <BarcodeRenderer type="datamatrix" data="" widthMm={14} heightMm={14} />,
    );

    expect(screen.getByText("No code data")).toBeInTheDocument();
  });

  it("applies the requested physical dimensions", () => {
    render(
      <BarcodeRenderer
        type="code128"
        data="ASSET-002"
        widthMm={22}
        heightMm={8}
      />,
    );

    const wrapper = screen.getByTestId("barcode-renderer-code128");
    expect(wrapper).toHaveStyle({ width: "22mm", height: "8mm" });
  });
});
