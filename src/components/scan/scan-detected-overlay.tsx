"use client";

import type { DetectedPhase } from "@/components/scan/scan-viewport";
import type { ScanResultPoint } from "@/hooks/use-barcode-scanner";

type Props = {
  phase: DetectedPhase;
  points: ScanResultPoint[];
  videoWidth: number;
  videoHeight: number;
  viewportWidth: number;
  viewportHeight: number;
};

const PHASE_STYLE: Record<DetectedPhase, { border: string; glow: string }> = {
  detecting: {
    border: "var(--scan)",
    glow: "rgba(194, 65, 12, 0.55)",
  },
  confirmed: {
    border: "#10b981",
    glow: "rgba(16, 185, 129, 0.55)",
  },
};

export function ScanDetectedOverlay({
  phase,
  points,
  videoWidth,
  videoHeight,
  viewportWidth,
  viewportHeight,
}: Props) {
  const mapped = mapPointsToViewport({
    points,
    videoWidth,
    videoHeight,
    viewportWidth,
    viewportHeight,
  });

  const rect = boundingRect(mapped);
  if (!rect) return null;

  const padding = 8;
  const x = Math.max(0, rect.minX - padding);
  const y = Math.max(0, rect.minY - padding);
  const width = Math.min(
    viewportWidth - x,
    rect.maxX - rect.minX + padding * 2,
  );
  const height = Math.min(
    viewportHeight - y,
    rect.maxY - rect.minY + padding * 2,
  );

  const style = PHASE_STYLE[phase];

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-testid="scan-detected-overlay"
      data-phase={phase}
    >
      <div
        className="absolute rounded-md border-2 animate-scan-detected transition-[border-color,box-shadow] duration-500"
        style={{
          left: x,
          top: y,
          width,
          height,
          borderColor: style.border,
          boxShadow: `0 0 18px ${style.glow}`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

type MapInput = {
  points: ScanResultPoint[];
  videoWidth: number;
  videoHeight: number;
  viewportWidth: number;
  viewportHeight: number;
};

function mapPointsToViewport({
  points,
  videoWidth,
  videoHeight,
  viewportWidth,
  viewportHeight,
}: MapInput): ScanResultPoint[] {
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return [];
  }
  const scale = Math.max(
    viewportWidth / videoWidth,
    viewportHeight / videoHeight,
  );
  const scaledW = videoWidth * scale;
  const scaledH = videoHeight * scale;
  const offsetX = (scaledW - viewportWidth) / 2;
  const offsetY = (scaledH - viewportHeight) / 2;
  return points.map((p) => ({
    x: p.x * scale - offsetX,
    y: p.y * scale - offsetY,
  }));
}

function boundingRect(points: ScanResultPoint[]) {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export const __test__ = { mapPointsToViewport, boundingRect };
