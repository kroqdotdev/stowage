"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CrudModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-black/50",
        // Mobile: bottom-sheet alignment
        "items-end justify-center px-0 pb-0 pt-10",
        // Desktop: centered modal
        "md:items-center md:justify-center md:px-4 md:py-6",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crud-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        data-testid="crud-modal-surface"
        className={cn(
          "flex w-full flex-col border border-border bg-background shadow-xl",
          // Mobile: attached to bottom, rounded only at top, safe-area padding
          "max-h-[90svh] rounded-t-2xl animate-in slide-in-from-bottom-8 duration-200",
          "pb-[env(safe-area-inset-bottom)]",
          // Desktop: centered card, rounded, bounded
          "md:max-h-[calc(100dvh-3rem)] md:max-w-lg md:rounded-xl md:pb-0 md:slide-in-from-bottom-0 md:zoom-in-95",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="space-y-1">
            <h2
              id="crud-modal-title"
              className="text-lg font-semibold tracking-tight"
            >
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
