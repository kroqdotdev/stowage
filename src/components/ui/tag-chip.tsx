import * as React from "react";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  The label chip: a printed asset tag drawn as the physical thing it is.
  1px border in dense tables, 1.5px standalone, 2px on the asset hero.
*/
const WEIGHT_CLASS = {
  table: "h-[23px] border",
  standalone: "h-6 border-[1.5px]",
  hero: "h-[34px] border-2 px-3 text-base",
} as const;

export type TagChipWeight = keyof typeof WEIGHT_CLASS;

export function TagChip({
  children,
  weight = "standalone",
  className,
  ...props
}: React.ComponentProps<"span"> & { weight?: TagChipWeight }) {
  return (
    <span
      data-slot="tag-chip"
      className={cn(
        "inline-flex shrink-0 items-center rounded-xs border-foreground bg-card px-[7px] font-mono text-[13px] leading-none font-semibold tracking-[0.04em] whitespace-nowrap text-foreground",
        WEIGHT_CLASS[weight],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/*
  A location chip shares the label shape: a pin glyph and the leaf name in
  the sans face, sentence case, never a path.
*/
export function LocationChip({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="location-chip"
      className={cn(
        "inline-flex h-[23px] shrink-0 items-center gap-1 rounded-xs border border-foreground bg-card px-[7px] text-[13px] leading-none font-semibold whitespace-nowrap text-foreground",
        className,
      )}
      {...props}
    >
      <MapPin className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}

/* Free-form keywords: borderless tinted chips. */
export function KeywordChip({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="keyword-chip"
      className={cn(
        "inline-flex h-6 items-center rounded-md bg-chip px-[9px] text-[13px] font-medium whitespace-nowrap text-foreground",
        className,
      )}
      {...props}
    >
      <span className="text-muted-foreground">#</span>
      {children}
    </span>
  );
}

/* Category prefixes (PT, HT) on the dashboard only: the same tint, mono. */
export function PrefixChip({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="prefix-chip"
      className={cn(
        "inline-flex h-6 min-w-11 items-center justify-center rounded-md bg-chip px-2 font-mono text-[13px] font-medium whitespace-nowrap text-ink-2",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
