"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type MobileActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  hideHeader?: boolean;
  children: React.ReactNode;
  contentClassName?: string;
  "aria-label"?: string;
};

export function MobileActionSheet({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  children,
  contentClassName,
  "aria-label": ariaLabel,
}: MobileActionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-testid="mobile-action-sheet"
        aria-label={ariaLabel}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "gap-0 rounded-t-md border-t pb-[max(1rem,env(safe-area-inset-bottom))] outline-hidden",
          contentClassName,
        )}
        showCloseButton={false}
        // Keep the phone keyboard down on open: focus the sheet, not its
        // first field. A field that asks for focus (React's autoFocus, which
        // focuses on mount, or data-autofocus) keeps it.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const content = event.currentTarget as HTMLElement | null;
          if (!content) return;
          const active = document.activeElement;
          if (active && active !== content && content.contains(active)) return;
          const wanted = content.querySelector<HTMLElement>(
            "[data-autofocus], [autofocus]",
          );
          (wanted ?? content).focus();
        }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <span
            aria-hidden="true"
            className="h-1 w-10 rounded-full bg-line-2"
            data-testid="mobile-action-sheet-handle"
          />
        </div>
        {hideHeader ? (
          <div className="sr-only">
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </div>
        ) : (
          <SheetHeader className="rule-ink mx-4 mb-3.5 gap-1 px-0 pt-2 pb-2.5">
            <SheetTitle className="wide text-lg font-bold">{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
        )}
        <div className="flex flex-col gap-2 px-4 pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
