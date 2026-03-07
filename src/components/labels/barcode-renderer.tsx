"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type BarcodeRendererProps = {
  type: "code128" | "datamatrix";
  data: string | null | undefined;
  widthMm: number;
  heightMm: number;
  className?: string;
  title?: string;
  squareCorners?: boolean;
};

const svgCache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

async function generateBarcodeSvg({
  type,
  data,
}: {
  type: "code128" | "datamatrix";
  data: string;
}) {
  const cacheKey = `${type}:${data}`;
  const cached = svgCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const bwipJs = await import("bwip-js/browser");
  const svg = bwipJs.toSVG({
    bcid: type === "code128" ? "code128" : "datamatrix",
    text: data,
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0,
    scale: type === "code128" ? 2 : 3,
  });

  if (svgCache.size >= MAX_CACHE_SIZE) {
    const firstKey = svgCache.keys().next().value;
    if (firstKey !== undefined) svgCache.delete(firstKey);
  }
  svgCache.set(cacheKey, svg);
  return svg;
}

export function BarcodeRenderer({
  type,
  data,
  widthMm,
  heightMm,
  className,
  title,
  squareCorners = false,
}: BarcodeRendererProps) {
  const normalizedData = useMemo(() => data?.trim() ?? "", [data]);
  const cacheKey = normalizedData ? `${type}:${normalizedData}` : "";
  const cachedSvg = normalizedData ? (svgCache.get(cacheKey) ?? null) : null;
  const [svgState, setSvgState] = useState<{
    key: string;
    markup: string | null;
  }>({
    key: cacheKey,
    markup: cachedSvg,
  });
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const svgMarkup =
    normalizedData.length === 0
      ? null
      : svgState.key === cacheKey
        ? svgState.markup
        : cachedSvg;
  const failed =
    normalizedData.length > 0 && errorKey === cacheKey && !svgMarkup;
  const renderState =
    normalizedData.length === 0
      ? "empty"
      : failed
        ? "error"
        : svgMarkup
          ? "ready"
          : "loading";

  useEffect(() => {
    let cancelled = false;

    if (!normalizedData) {
      return () => {
        cancelled = true;
      };
    }

    void generateBarcodeSvg({ type, data: normalizedData })
      .then((svg) => {
        if (!cancelled) {
          setSvgState({ key: cacheKey, markup: svg });
          setErrorKey(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvgState({ key: cacheKey, markup: null });
          setErrorKey(cacheKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, normalizedData, type]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white text-black [&_svg]:h-full [&_svg]:w-full",
        squareCorners ? "rounded-none" : "rounded-sm",
        className,
      )}
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
      data-barcode-type={type}
      data-barcode-value={normalizedData}
      data-barcode-state={renderState}
      data-testid={`barcode-renderer-${type}`}
      aria-label={title ?? `${type} code`}
      role="img"
    >
      {svgMarkup && !failed ? (
        <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-slate-100/80 px-1 text-center text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
          {normalizedData ? "Code unavailable" : "No code data"}
        </div>
      )}
    </div>
  );
}

export { generateBarcodeSvg };
