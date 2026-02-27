"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { AttachmentCard } from "@/components/attachments/attachment-card"
import { getAttachmentUiErrorMessage } from "@/components/attachments/error-messages"
import type { AttachmentItem } from "@/components/attachments/types"
import type { Id } from "@/lib/convex-api"
import { api } from "@/lib/convex-api"

export function AttachmentList({
  assetId,
}: {
  assetId: Id<"assets">
}) {
  const attachments = useQuery(api.attachments.listAttachments, { assetId })
  const deleteAttachment = useMutation(api.attachments.deleteAttachment)
  const retryAttachment = useMutation(api.attachments.retryAttachmentOptimization)

  const [deletingAttachmentId, setDeletingAttachmentId] = useState<Id<"attachments"> | null>(null)
  const [retryingAttachmentId, setRetryingAttachmentId] = useState<Id<"attachments"> | null>(null)

  const rows = useMemo(
    () => ((attachments ?? []) as AttachmentItem[]),
    [attachments],
  )

  if (attachments === undefined) {
    return (
      <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
        Loading attachments...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-5 text-sm text-muted-foreground">
        No attachments yet.
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((attachment) => (
        <AttachmentCard
          key={attachment._id}
          attachment={attachment}
          deleting={deletingAttachmentId === attachment._id}
          retrying={retryingAttachmentId === attachment._id}
          onDelete={async (attachmentId) => {
            setDeletingAttachmentId(attachmentId)
            try {
              await deleteAttachment({ attachmentId })
              toast.success("Attachment deleted")
            } catch (error) {
              toast.error(getAttachmentUiErrorMessage(error, "Unable to delete attachment"))
            } finally {
              setDeletingAttachmentId(null)
            }
          }}
          onRetry={async (attachmentId) => {
            setRetryingAttachmentId(attachmentId)
            try {
              await retryAttachment({ attachmentId })
              toast.success("Attachment retry queued")
            } catch (error) {
              toast.error(getAttachmentUiErrorMessage(error, "Unable to retry attachment"))
            } finally {
              setRetryingAttachmentId(null)
            }
          }}
        />
      ))}
    </div>
  )
}
