"use client";

import { useCallback, useRef } from "react";

/*
  Press and hold (or right-click) to run an action. Returns handlers to spread
  on the element and `consumeClick`, which reports (once) whether the click
  that ends a long press should be swallowed.
*/
export function useLongPress(onLongPress: () => void, delay = 450) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const handlers = {
    onPointerDown: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      fired.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.(10);
        }
        onLongPress();
      }, delay);
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (!origin.current) return;
      const dx = Math.abs(event.clientX - origin.current.x);
      const dy = Math.abs(event.clientY - origin.current.y);
      if (dx > 8 || dy > 8) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      clear();
      if (!fired.current) {
        fired.current = true;
        onLongPress();
      }
    },
  };

  const consumeClick = useCallback(() => {
    if (fired.current) {
      fired.current = false;
      return true;
    }
    return false;
  }, []);

  return { handlers, consumeClick };
}
