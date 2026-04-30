"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AttachmentCard } from "@/components/attachments/attachment-card";
import { getAttachmentUiErrorMessage } from "@/components/attachments/error-messages";
import type { AttachmentItem } from "@/components/attachments/types";
import {
  deleteAttachment,
  listAttachments,
  retryAttachment,
} from "@/lib/api/attachments";

export function AttachmentList({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient();
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", assetId],
    queryFn: () => listAttachments(assetId),
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
  });
  const retryMutation = useMutation({
    mutationFn: (attachmentId: string) => retryAttachment(attachmentId),
  });

  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);
  const [retryingAttachmentId, setRetryingAttachmentId] = useState<
    string | null
  >(null);

  const rows = useMemo(
    () => (attachmentsQuery.data ?? []) as AttachmentItem[],
    [attachmentsQuery.data],
  );

  if (attachmentsQuery.isPending) {
    return (
      <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
        Loading attachments...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
        No attachments yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {rows.map((attachment) => (
        <AttachmentCard
          key={attachment.id}
          attachment={attachment}
          deleting={deletingAttachmentId === attachment.id}
          retrying={retryingAttachmentId === attachment.id}
          onDelete={async (attachmentId) => {
            setDeletingAttachmentId(attachmentId);
            try {
              await deleteMutation.mutateAsync(attachmentId);
              void queryClient.invalidateQueries({
                queryKey: ["attachments", assetId],
              });
              void queryClient.invalidateQueries({
                queryKey: ["storage-usage"],
              });
              toast.success("Attachment deleted");
            } catch (error) {
              toast.error(
                getAttachmentUiErrorMessage(
                  error,
                  "Unable to delete attachment",
                ),
              );
            } finally {
              setDeletingAttachmentId(null);
            }
          }}
          onRetry={async (attachmentId) => {
            setRetryingAttachmentId(attachmentId);
            try {
              await retryMutation.mutateAsync(attachmentId);
              void queryClient.invalidateQueries({
                queryKey: ["attachments", assetId],
              });
              toast.success("Attachment retry queued");
            } catch (error) {
              toast.error(
                getAttachmentUiErrorMessage(
                  error,
                  "Unable to retry attachment",
                ),
              );
            } finally {
              setRetryingAttachmentId(null);
            }
          }}
        />
      ))}
    </div>
  );
}
