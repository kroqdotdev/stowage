import * as React from "react";

import { cn } from "@/lib/utils";

/*
  Cards are reserved for objects: the stat strip, Next service, the label
  preview, the tabbed details, the location tree, the location detail card and
  the Assets table. 1px lines inside cards; the 2px rule belongs to sheets.
*/
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel"
      className={cn(
        "rounded-md border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function PanelBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-body"
      className={cn("px-[18px] py-3.5", className)}
      {...props}
    />
  );
}

/* A footer band: a 1px line, then the card's actions or caption. */
export function PanelFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-footer"
      className={cn(
        "flex items-center gap-2 border-t border-border px-[18px] py-3",
        className,
      )}
      {...props}
    />
  );
}
