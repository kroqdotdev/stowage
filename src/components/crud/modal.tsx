"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  A dialog on the charcoal scrim. The title carries the 2px ink rule; the
  footer is a band under a 1px line with verb + object actions.
*/
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
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-[#1f2220]/80",
        // Mobile: bottom-sheet alignment
        "items-end justify-center px-0 pt-10 pb-0",
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
        ref={modalRef}
        data-testid="crud-modal-surface"
        tabIndex={-1}
        className={cn(
          "flex w-full flex-col border border-border bg-card shadow-[0_24px_48px_rgba(0,0,0,.18)] outline-hidden",
          "max-h-[90svh] rounded-t-md animate-in slide-in-from-bottom-8 duration-200",
          "pb-[env(safe-area-inset-bottom)]",
          "md:max-h-[calc(100dvh-3rem)] md:max-w-lg md:rounded-md md:pb-0 md:slide-in-from-bottom-0 md:zoom-in-95",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0 flex-1 rule-ink pb-2.5">
            <h2
              id="crud-modal-title"
              className="wide text-lg leading-tight font-bold text-foreground"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-ink-2">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="-mr-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-ink-2 hover:bg-secondary hover:text-foreground"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
