import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "@/hooks/use-media-query";

type MqlListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initial: boolean) {
  const listeners: MqlListener[] = [];
  const mql = {
    matches: initial,
    media: "",
    addEventListener: (_event: string, cb: MqlListener) => {
      listeners.push(cb);
    },
    removeEventListener: (_event: string, cb: MqlListener) => {
      const index = listeners.indexOf(cb);
      if (index >= 0) listeners.splice(index, 1);
    },
    dispatchChange: (matches: boolean) => {
      mql.matches = matches;
      listeners
        .slice()
        .forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
    listenerCount: () => listeners.length,
  };
  (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
    vi.fn().mockReturnValue(mql as unknown as MediaQueryList);
  return mql;
}

describe("useMediaQuery", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
      originalMatchMedia;
  });

  it("returns the initial match state", () => {
    installMatchMedia(true);
    const { result } = renderHook(() =>
      useMediaQuery("(min-width: 1024px)"),
    );
    expect(result.current).toBe(true);
  });

  it("returns false when the query does not match", () => {
    installMatchMedia(false);
    const { result } = renderHook(() =>
      useMediaQuery("(min-width: 1024px)"),
    );
    expect(result.current).toBe(false);
  });

  it("updates when the media query changes", () => {
    const mql = installMatchMedia(false);
    const { result } = renderHook(() =>
      useMediaQuery("(min-width: 1024px)"),
    );
    expect(result.current).toBe(false);

    act(() => {
      mql.dispatchChange(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql.dispatchChange(false);
    });
    expect(result.current).toBe(false);
  });

  it("removes its listener on unmount", () => {
    const mql = installMatchMedia(false);
    const { unmount } = renderHook(() =>
      useMediaQuery("(min-width: 1024px)"),
    );
    expect(mql.listenerCount()).toBe(1);
    unmount();
    expect(mql.listenerCount()).toBe(0);
  });

  it("returns false when matchMedia is unavailable (SSR-like env)", () => {
    const anyWin = window as unknown as {
      matchMedia?: typeof window.matchMedia;
    };
    const saved = anyWin.matchMedia;
    delete anyWin.matchMedia;
    try {
      const { result } = renderHook(() =>
        useMediaQuery("(min-width: 1024px)"),
      );
      expect(result.current).toBe(false);
    } finally {
      anyWin.matchMedia = saved;
    }
  });
});
