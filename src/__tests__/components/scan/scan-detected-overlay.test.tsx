import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  ScanDetectedOverlay,
  __test__,
} from "@/components/scan/scan-detected-overlay";

const { mapPointsToViewport, boundingRect } = __test__;

describe("mapPointsToViewport", () => {
  it("returns [] when the video has no dimensions yet", () => {
    expect(
      mapPointsToViewport({
        points: [{ x: 10, y: 10 }],
        videoWidth: 0,
        videoHeight: 0,
        viewportWidth: 300,
        viewportHeight: 300,
      }),
    ).toEqual([]);
  });

  it("returns [] for an empty point list", () => {
    expect(
      mapPointsToViewport({
        points: [],
        videoWidth: 640,
        videoHeight: 480,
        viewportWidth: 300,
        viewportHeight: 300,
      }),
    ).toEqual([]);
  });

  it("defends against undefined point lists", () => {
    expect(
      mapPointsToViewport({
        points: undefined as unknown as Array<{ x: number; y: number }>,
        videoWidth: 640,
        videoHeight: 480,
        viewportWidth: 300,
        viewportHeight: 300,
      }),
    ).toEqual([]);
  });

  it("maps square video 1:1 to square viewport", () => {
    const points = mapPointsToViewport({
      points: [{ x: 500, y: 500 }],
      videoWidth: 1000,
      videoHeight: 1000,
      viewportWidth: 500,
      viewportHeight: 500,
    });
    expect(points).toEqual([{ x: 250, y: 250 }]);
  });

  it("crops the larger axis when the stream is wider than the viewport (object-cover)", () => {
    // 1000x500 video into 500x500 viewport: scale = max(500/1000, 500/500) = 1
    // scaledW = 1000, scaledH = 500, offsetX = (1000-500)/2 = 250, offsetY = 0
    const points = mapPointsToViewport({
      points: [
        { x: 250, y: 0 },
        { x: 750, y: 500 },
      ],
      videoWidth: 1000,
      videoHeight: 500,
      viewportWidth: 500,
      viewportHeight: 500,
    });
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 500, y: 500 },
    ]);
  });
});

describe("boundingRect", () => {
  it("returns null for an empty list", () => {
    expect(boundingRect([])).toBeNull();
  });

  it("computes the tight axis-aligned box over the points", () => {
    expect(
      boundingRect([
        { x: 10, y: 20 },
        { x: 30, y: 5 },
        { x: 25, y: 50 },
      ]),
    ).toEqual({ minX: 10, minY: 5, maxX: 30, maxY: 50 });
  });
});

describe("<ScanDetectedOverlay />", () => {
  it("renders nothing when there are no usable points", () => {
    render(
      <ScanDetectedOverlay
        points={[]}
        videoWidth={0}
        videoHeight={0}
        viewportWidth={0}
        viewportHeight={0}
      />,
    );
    expect(screen.queryByTestId("scan-detected-overlay")).toBeNull();
  });

  it("renders the bounding rectangle aligned in the viewport when points are valid", () => {
    render(
      <ScanDetectedOverlay
        points={[
          { x: 250, y: 125 },
          { x: 750, y: 125 },
          { x: 750, y: 375 },
          { x: 250, y: 375 },
        ]}
        videoWidth={1000}
        videoHeight={500}
        viewportWidth={500}
        viewportHeight={500}
      />,
    );
    const overlay = screen.getByTestId("scan-detected-overlay");
    const box = overlay.querySelector("div") as HTMLDivElement;
    expect(box).not.toBeNull();
    expect(box.style.width).not.toBe("");
    expect(box.style.height).not.toBe("");
  });
});
