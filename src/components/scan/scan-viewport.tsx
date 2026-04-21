"use client";

import { type RefObject } from "react";
import { cn } from "@/lib/utils";

export function ScanViewport({
  videoRef,
  active,
  className,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-black",
        className,
      )}
      data-testid="scan-viewport"
      data-active={active}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
        autoPlay
        aria-hidden="true"
      />
      <ScanReticle active={active} />
    </div>
  );
}

function ScanReticle({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div className="relative h-[68%] w-[68%]">
        <Corner className="left-0 top-0" rotate="0deg" />
        <Corner className="right-0 top-0" rotate="90deg" />
        <Corner className="right-0 bottom-0" rotate="180deg" />
        <Corner className="left-0 bottom-0" rotate="270deg" />
        {active ? (
          <div
            className="absolute inset-x-2 h-[2px] rounded-full bg-[var(--scan)] shadow-[0_0_12px_var(--scan)] animate-scan-line motion-reduce:hidden"
            data-testid="scan-line"
          />
        ) : null}
      </div>
    </div>
  );
}

function Corner({
  className,
  rotate,
}: {
  className: string;
  rotate: string;
}) {
  return (
    <div
      className={cn("absolute h-6 w-6", className)}
      style={{ transform: `rotate(${rotate})` }}
    >
      <div className="absolute left-0 top-0 h-[2px] w-full bg-[var(--scan)]" />
      <div className="absolute left-0 top-0 h-full w-[2px] bg-[var(--scan)]" />
    </div>
  );
}
