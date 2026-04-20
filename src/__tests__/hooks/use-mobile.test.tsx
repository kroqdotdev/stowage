import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIsMobile } from "@/hooks/use-mobile";

type MqlListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialWidth: number) {
  const listeners: MqlListener[] = [];
  const mql = {
    matches: initialWidth < 768,
    media: `(max-width: 767px)`,
    addEventListener: (_event: string, cb: MqlListener) => {
      listeners.push(cb);
    },
    removeEventListener: (_event: string, cb: MqlListener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
    dispatchChange: (width: number) => {
      (window as unknown as { innerWidth: number }).innerWidth = width;
      listeners.slice().forEach((cb) =>
        cb({ matches: width < 768 } as MediaQueryListEvent),
      );
    },
  };
  (window as unknown as { innerWidth: number }).innerWidth = initialWidth;
  (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = vi
    .fn()
    .mockReturnValue(mql as unknown as MediaQueryList);
  return mql;
}

describe("useIsMobile", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
      originalMatchMedia;
    (window as unknown as { innerWidth: number }).innerWidth = originalInnerWidth;
  });

  it("is true at 500px wide", () => {
    installMatchMedia(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("is false at 1200px wide", () => {
    installMatchMedia(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("reacts to viewport changes", () => {
    const mql = installMatchMedia(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
      mql.dispatchChange(500);
    });
    expect(result.current).toBe(true);
  });
});
