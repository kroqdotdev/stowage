"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CrudModal } from "@/components/crud/modal";

/*
  A destructive dialog opens with focus on the safe action, so Enter is never
  destructive. Actions are verb + object.
*/
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const safeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => safeRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <CrudModal
      open={open}
      title={title}
      description={description}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      footer={
        <>
          <Button
            ref={safeRef}
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">This action cannot be undone.</p>
    </CrudModal>
  );
}
