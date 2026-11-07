import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTone = "danger" | "repair" | "slate";

export type StatItem = {
  key: string;
  label: string;
  shortLabel?: string;
  value: number | string;
  /** Rendered small before a money value. */
  unit?: string;
  /** Colour applies only when the value is non-zero. */
  tone?: StatTone;
  href?: string;
};

const TONE_CLASS: Record<StatTone, string> = {
  danger: "text-destructive",
  repair: "text-repair",
  slate: "text-slate",
};

/*
  One component: five equal cells on desktop (28px numerals, 14px labels, the
  money value a step smaller on a shared 31px numeral box); a four-up with the
  fifth cell as a footer line below 1024px. A zero is set lighter in ink-3.
*/
export function StatStrip({
  items,
  className,
}: {
  items: StatItem[];
  className?: string;
}) {
  return (
    <div
      data-slot="stat-strip"
      className={cn(
        "grid grid-cols-4 overflow-hidden rounded-md border border-border bg-card lg:grid-cols-5",
        className,
      )}
    >
      {items.map((item, index) => {
        const isZero = item.value === 0;
        const isFooter = index === 4;
        const numeralClass = cn(
          "block h-[31px] text-[28px] leading-[31px] font-bold tabular-nums whitespace-nowrap wide",
          isFooter && "text-2xl",
          item.tone && !isZero ? TONE_CLASS[item.tone] : "text-foreground",
          isZero && "font-medium text-muted-foreground",
        );
        const content = (
          <>
            {item.href ? (
              <ArrowUpRight
                aria-hidden="true"
                className="absolute top-2.5 right-3 hidden size-[13px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
              />
            ) : null}
            <b className={numeralClass}>
              {item.unit ? (
                <span className="mr-1 text-[13px] font-semibold text-muted-foreground">
                  {item.unit}
                </span>
              ) : null}
              {item.value}
            </b>
            <span className="block text-sm text-ink-2 group-hover:underline group-hover:underline-offset-[3px]">
              {item.shortLabel ? (
                <>
                  <span className="lg:hidden">{item.shortLabel}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </span>
          </>
        );
        const cellClass = cn(
          "group relative block px-3.5 py-3.5 lg:px-[18px] lg:pr-[34px]",
          index > 0 && "border-l border-border",
          isFooter &&
            "col-span-full flex items-baseline gap-2 border-t border-border border-l-0 px-3.5 py-2.5 text-left lg:col-span-1 lg:block lg:border-t-0 lg:border-l lg:py-3.5",
          item.href && "hover:bg-secondary",
        );
        return item.href ? (
          <Link
            key={item.key}
            href={item.href}
            className={cellClass}
            data-stat={item.key}
          >
            {content}
          </Link>
        ) : (
          <div key={item.key} className={cellClass} data-stat={item.key}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
