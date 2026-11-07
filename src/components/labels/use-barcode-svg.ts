"use client";

import { useEffect, useState } from "react";
import { generateBarcodeSvg } from "@/components/labels/barcode-renderer";

/*
  Renders a Code 128 or Data Matrix symbol with the app's own label engine
  (bwip-js) and returns the SVG markup. Returns null until it is ready.
*/
export function useBarcodeSvg(
  type: "code128" | "datamatrix",
  data: string | null | undefined,
) {
  const value = data?.trim() ?? "";
  const [state, setState] = useState<{ key: string; svg: string | null }>({
    key: "",
    svg: null,
  });
  const key = `${type}:${value}`;

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    void generateBarcodeSvg({ type, data: value })
      .then((svg) => {
        if (!cancelled) setState({ key, svg });
      })
      .catch(() => {
        if (!cancelled) setState({ key, svg: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key, type, value]);

  return state.key === key ? state.svg : null;
}
