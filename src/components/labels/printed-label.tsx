"use client";

import { useBarcodeSvg } from "@/components/labels/use-barcode-svg";
import { cn } from "@/lib/utils";

/*
  A real printed label: Code 128 across the top, the tag and name under it,
  and a Data Matrix at the right, rendered by the app's own label engine.
  Used as the brand object on the login plate.
*/
export function PrintedLabel({
  tag,
  name,
  topLeft,
  topRight,
  url,
  className,
}: {
  tag: string;
  name: string;
  topLeft: string;
  topRight: string;
  url: string;
  className?: string;
}) {
  const barcode = useBarcodeSvg("code128", tag);
  const matrix = useBarcodeSvg("datamatrix", url);

  return (
    <figure
      data-slot="printed-label"
      aria-label={`Printed label for ${tag}, ${name}`}
      className={cn(
        "w-full rounded-xs bg-white px-[26px] pt-[22px] pb-5 text-[#1b1d1a] shadow-[10px_10px_0_var(--color-amber)] max-md:px-3.5 max-md:pt-3 max-md:pb-3 max-md:shadow-[5px_5px_0_var(--color-amber)]",
        className,
      )}
    >
      <div className="mb-2.5 flex justify-between gap-4 font-mono text-[13px] font-semibold tracking-[0.06em] uppercase max-md:mb-2 max-md:text-[11px]">
        <span>{topLeft}</span>
        <span>{topRight}</span>
      </div>
      <div
        aria-hidden="true"
        className="h-24 w-full max-md:h-11 [&_svg]:h-full [&_svg]:w-full"
        // The engine's SVG is stretched to the label width like a printed bar.
        dangerouslySetInnerHTML={
          barcode
            ? {
                __html: barcode.replace(
                  "<svg ",
                  '<svg preserveAspectRatio="none" ',
                ),
              }
            : undefined
        }
      />
      <div className="mt-3 flex items-end justify-between gap-4">
        <figcaption className="min-w-0">
          <div className="font-mono text-[34px] leading-none font-semibold tracking-[0.04em] max-md:text-xl">
            {tag}
          </div>
          <div className="mt-2 truncate text-[15px] font-semibold max-md:mt-1 max-md:text-[13px]">
            {name}
          </div>
        </figcaption>
        <div
          aria-hidden="true"
          className="size-[76px] shrink-0 max-md:size-[46px] [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={matrix ? { __html: matrix } : undefined}
        />
      </div>
    </figure>
  );
}
