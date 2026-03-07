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
import { Badge } from "@/components/ui/badge";
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
    return <FileImage className="size-5 text-muted-foreground" />;
  }

  if (fileKind === "pdf") {
    return <FileText className="size-5 text-muted-foreground" />;
  }

  return <FileSpreadsheet className="size-5 text-muted-foreground" />;
}

function StatusBadge({ status }: { status: AttachmentItem["status"] }) {
  if (status === "ready") {
    return (
      <Badge className="border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
        Ready
      </Badge>
    );
  }

  if (status === "failed") {
    return (
      <Badge className="border-destructive/50 bg-destructive/10 text-destructive">
        Failed
      </Badge>
    );
  }

  if (status === "processing") {
    return (
      <Badge className="border-amber-300/70 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200">
        Processing
      </Badge>
    );
  }

  return (
    <Badge className="border-slate-300/70 bg-slate-100 text-slate-900 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-200">
      Pending
    </Badge>
  );
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
  onDelete: (attachmentId: AttachmentItem["_id"]) => Promise<void>;
  onRetry: (attachmentId: AttachmentItem["_id"]) => Promise<void>;
}) {
  const dateFormat = useAppDateFormat();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canPreviewImage = attachment.fileKind === "image" && attachment.url;

  return (
    <>
      <article className="rounded-lg border border-border/60 bg-background p-3">
        <div className="flex gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/20">
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

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">
                {attachment.fileName}
              </p>
              <StatusBadge status={attachment.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {attachment.fileType} •{" "}
              {formatSize(
                attachment.fileSizeOptimized ?? attachment.fileSizeOriginal,
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Uploaded{" "}
              {formatDateFromTimestamp(attachment.uploadedAt, dateFormat)}
            </p>
            {attachment.status === "failed" && attachment.optimizationError ? (
              <p className="text-xs text-destructive">
                {attachment.optimizationError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="cursor-pointer"
            asChild
            disabled={!attachment.url}
          >
            <a
              href={attachment.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              <Download className="size-3.5" />
              Download
            </a>
          </Button>

          {attachment.status === "failed" ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="cursor-pointer"
              disabled={retrying}
              onClick={() => {
                void onRetry(attachment._id);
              }}
            >
              <RefreshCcw className="size-3.5" />
              Retry
            </Button>
          ) : null}

          <Button
            type="button"
            variant="destructive"
            size="xs"
            className="cursor-pointer"
            disabled={deleting}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </article>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete attachment"
        description={`Delete ${attachment.fileName}?`}
        confirmLabel="Delete attachment"
        busy={deleting}
        onConfirm={() => {
          void onDelete(attachment._id);
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
