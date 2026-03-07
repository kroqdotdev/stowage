"use client";

import { useEffect, useState } from "react";
import { resolveAppOrigin } from "@/components/labels/helpers";

const FALLBACK_ORIGIN = "https://stowage.local";

export function useLabelOrigin(origin?: string) {
  const [resolvedOrigin, setResolvedOrigin] = useState(FALLBACK_ORIGIN);

  useEffect(() => {
    if (origin) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setResolvedOrigin(resolveAppOrigin());
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [origin]);

  return origin ?? resolvedOrigin;
}
