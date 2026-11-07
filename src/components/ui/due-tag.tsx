import * as React from "react";

import { cn } from "@/lib/utils";

/*
  Due: a filled red tag in the chip language = overdue; bold ink text = due
  within 48 hours; later dates are plain text. Nothing in a list shares a
  button's silhouette.
*/
export function describeDue(days: number): {
  tone: "overdue" | "soon" | "later";
  long: string;
  short: string;
} {
  if (days < 0) {
    const n = Math.abs(days);
    return {
      tone: "overdue",
      long: `Overdue ${n} ${n === 1 ? "day" : "days"}`,
      short: `Overdue ${n}d`,
    };
  }
  if (days === 0) return { tone: "soon", long: "Today", short: "Today" };
  if (days === 1) return { tone: "soon", long: "Tomorrow", short: "Tomorrow" };
  return {
    tone: "later",
    long: `In ${days} days`,
    short: `In ${days}d`,
  };
}

export function DueTag({
  days,
  className,
  ...props
}: React.ComponentProps<"span"> & { days: number }) {
  const due = describeDue(days);
  return (
    <span
      data-slot="due-tag"
      data-tone={due.tone}
      className={cn(
        "inline-flex h-[23px] shrink-0 items-center text-sm whitespace-nowrap",
        due.tone === "overdue" &&
          "rounded-xs bg-destructive px-2 text-[13px] font-semibold text-white",
        due.tone === "soon" && "font-bold text-foreground",
        due.tone === "later" && "font-medium text-ink-2",
        className,
      )}
      {...props}
    >
      <span className="md:hidden">{due.short}</span>
      <span className="hidden md:inline">{due.long}</span>
    </span>
  );
}
