"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ScanDetectedOverlay } from "@/components/scan/scan-detected-overlay";
import type { ScanResultPoint } from "@/hooks/use-barcode-scanner";
import { cn } from "@/lib/utils";

export type DetectedFrame = {
  points: ScanResultPoint[];
  videoWidth: number;
  videoHeight: number;
};

export function ScanViewport({
  videoRef,
  active,
  detected,
  className,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  detected: DetectedFrame | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () =>
      setSize({ width: node.clientWidth, height: node.clientHeight });
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-black",
        className,
      )}
      data-testid="scan-viewport"
      data-active={active}
      data-detected={Boolean(detected)}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
        aria-hidden="true"
      />
      <ScanReticle detected={Boolean(detected)} />
      {detected ? (
        <ScanDetectedOverlay
          points={detected.points}
          videoWidth={detected.videoWidth}
          videoHeight={detected.videoHeight}
          viewportWidth={size.width}
          viewportHeight={size.height}
        />
      ) : null}
    </div>
  );
}

function ScanReticle({ detected }: { detected: boolean }) {
  const color = detected ? "#10b981" : "var(--scan)";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      data-detected={detected}
    >
      <div className="relative h-[68%] w-[68%]">
        <Corner className="left-0 top-0" rotate="0deg" color={color} />
        <Corner className="right-0 top-0" rotate="90deg" color={color} />
        <Corner className="right-0 bottom-0" rotate="180deg" color={color} />
        <Corner className="left-0 bottom-0" rotate="270deg" color={color} />
      </div>
    </div>
  );
}

function Corner({
  className,
  rotate,
  color,
}: {
  className: string;
  rotate: string;
  color: string;
}) {
  return (
    <div
      className={cn("absolute h-6 w-6", className)}
      style={{ transform: `rotate(${rotate})` }}
    >
      <div
        className="absolute left-0 top-0 h-[2px] w-full transition-colors duration-150"
        style={{ background: color }}
      />
      <div
        className="absolute left-0 top-0 h-full w-[2px] transition-colors duration-150"
        style={{ background: color }}
      />
    </div>
  );
}
