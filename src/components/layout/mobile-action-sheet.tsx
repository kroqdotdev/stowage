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
        className={cn(
          "gap-0 rounded-t-2xl border-t pb-[max(1rem,env(safe-area-inset-bottom))]",
          contentClassName,
        )}
        showCloseButton={false}
      >
        <div className="flex justify-center pt-2 pb-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-10 rounded-full bg-muted-foreground/30"
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
          <SheetHeader className="pt-2 pb-3">
            <SheetTitle>{title}</SheetTitle>
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
