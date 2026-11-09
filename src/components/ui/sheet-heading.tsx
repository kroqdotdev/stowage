import * as React from "react";

import { cn } from "@/lib/utils";

/*
  A sheet: a list that sits on the concrete under a heading with the 2px ink
  rule. "See all" never sits in a heading; truncated lists close with a quiet
  line where you land. Complete lists may carry a plain navigation name
  ("Open Categories") in the `aside` slot.
*/
export function SheetHeading({
  title,
  count,
  aside,
  as: Tag = "h2",
  className,
}: {
  title: React.ReactNode;
  count?: number | string;
  aside?: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      data-slot="sheet-heading"
      className={cn(
        "mb-1 flex items-end justify-between gap-4 rule-ink pb-2.5",
        className,
      )}
    >
      <Tag className="wide text-lg leading-none font-bold text-foreground">
        {title}
        {count !== undefined ? (
          <span className="ml-2 align-[1px] font-mono text-[13px] font-medium tracking-normal text-muted-foreground">
            {count}
          </span>
        ) : null}
      </Tag>
      {aside ? (
        <div className="shrink-0 text-sm font-medium text-ink-2 [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-foreground">
          {aside}
        </div>
      ) : null}
    </div>
  );
}

/* The quiet closing line under a truncated list. */
export function SheetFoot({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-foot"
      className={cn(
        "px-0.5 pt-3 text-[13px] text-muted-foreground [&_a]:font-medium [&_a]:text-ink-2 [&_a]:underline [&_a]:underline-offset-[3px] [&_a:hover]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
