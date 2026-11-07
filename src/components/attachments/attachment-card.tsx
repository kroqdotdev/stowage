"use client";

import { useState } from "react";
import {
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/crud/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { AttachmentItem } from "@/components/attachments/types";
import { formatDateFromTimestamp } from "@/lib/date-format";
import { useAppDateFormat } from "@/lib/use-app-date-format";

function formatSize(size: number | null) {
  if (!size) {
    return "—";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function FileKindIcon({ fileKind }: { fileKind: AttachmentItem["fileKind"] }) {
  if (fileKind === "image") {
    return <FileImage className="size-5 text-ink-2" />;
  }

  if (fileKind === "pdf") {
    return <FileText className="size-5 text-ink-2" />;
  }

  return <FileSpreadsheet className="size-5 text-ink-2" />;
}

/* Status colour only on exceptions: Failed is red, the rest stay quiet. */
function StatusLabel({ status }: { status: AttachmentItem["status"] }) {
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <span
          aria-hidden="true"
          className="size-[9px] shrink-0 rounded-xs bg-current"
        />
        Failed
      </span>
    );
  }

  const label =
    status === "ready"
      ? "Ready"
      : status === "processing"
        ? "Processing"
        : "Pending";
  return <span className="text-muted-foreground">{label}</span>;
}

export function AttachmentCard({
  attachment,
  deleting,
  retrying,
  onDelete,
  onRetry,
}: {
  attachment: AttachmentItem;
  deleting: boolean;
  retrying: boolean;
  onDelete: (attachmentId: AttachmentItem["id"]) => Promise<void>;
  onRetry: (attachmentId: AttachmentItem["id"]) => Promise<void>;
}) {
  const dateFormat = useAppDateFormat();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canPreviewImage = attachment.fileKind === "image" && attachment.url;

  return (
    <>
      <article className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xs border border-border bg-secondary">
          {canPreviewImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.url ?? undefined}
              alt={attachment.fileName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileKindIcon fileKind={attachment.fileKind} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-sm font-medium text-foreground">
            {attachment.fileName}
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-2">
            <span>
              {formatSize(
                attachment.fileSizeOptimized ?? attachment.fileSizeOriginal,
              )}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span>
              Uploaded{" "}
              {formatDateFromTimestamp(attachment.uploadedAt, dateFormat)}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <StatusLabel status={attachment.status} />
          </p>
          {attachment.status === "failed" && attachment.optimizationError ? (
            <p className="text-[13px] text-destructive">
              {attachment.optimizationError}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:pl-[60px]">
          <Button
            type="button"
            variant="outline"
            size="xs"
            asChild
            disabled={!attachment.url}
          >
            <a
              href={attachment.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              <Download />
              Download
            </a>
          </Button>

          {attachment.status === "failed" ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={retrying}
              onClick={() => {
                void onRetry(attachment.id);
              }}
            >
              <RefreshCcw />
              Retry
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={deleting}
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete ${attachment.fileName}…`}
            title="Delete…"
          >
            <Trash2 />
          </Button>
        </div>
      </article>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete attachment?"
        description={`${attachment.fileName} is deleted from this asset.`}
        confirmLabel="Delete attachment"
        busy={deleting}
        onConfirm={() => {
          void onDelete(attachment.id);
        }}
        onClose={() => {
          if (!deleting) {
            setConfirmOpen(false);
          }
        }}
      />
    </>
  );
}
