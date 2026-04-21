"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ServiceRecordAttachment } from "@/components/services/types";
import { getApiErrorMessage } from "@/components/crud/error-messages";
import {
  deleteServiceRecordAttachment,
  listServiceRecordAttachments,
  uploadServiceRecordAttachment,
} from "@/lib/api/attachments";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ACCEPTED_FILE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
]);

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return "";
  }
  return fileName.slice(dotIndex + 1).toLocaleLowerCase();
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function ServiceRecordAttachments({
  serviceRecordId,
}: {
  serviceRecordId: string;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const attachmentsQuery = useQuery({
    queryKey: ["service-record-attachments", serviceRecordId],
    queryFn: () => listServiceRecordAttachments(serviceRecordId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadServiceRecordAttachment(serviceRecordId, file),
  });
  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      deleteServiceRecordAttachment(attachmentId),
  });

  const attachments = useMemo(
    () => (attachmentsQuery.data ?? []) as ServiceRecordAttachment[],
    [attachmentsQuery.data],
  );

  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);

  async function handleFiles(inputFiles: FileList | null) {
    if (!inputFiles || inputFiles.length === 0) {
      return;
    }

    const files = Array.from(inputFiles);
    for (const file of files) {
      const extension = getExtension(file.name);
      if (!ACCEPTED_FILE_EXTENSIONS.has(extension)) {
        toast.error(`Unsupported file type: ${file.name}`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`File too large: ${file.name}`);
        return;
      }
    }

    setUploading(true);
    try {
      await Promise.all(files.map((file) => uploadMutation.mutateAsync(file)));
      toast.success(
        files.length === 1 ? "Attachment uploaded" : "Attachments uploaded",
      );
      void queryClient.invalidateQueries({
        queryKey: ["service-record-attachments", serviceRecordId],
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to upload attachment"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        data-testid="service-record-attachment-file-input"
        accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Add attachment
      </Button>

      {attachmentsQuery.isPending ? (
        <div className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground">
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
          No record attachments yet.
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {attachment.url ? (
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                  >
                    <a href={attachment.url} target="_blank" rel="noreferrer">
                      <Paperclip className="h-4 w-4" />
                      Open
                    </a>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer text-destructive"
                  disabled={deletingAttachmentId === attachment.id}
                  onClick={async () => {
                    setDeletingAttachmentId(attachment.id);
                    try {
                      await deleteMutation.mutateAsync(attachment.id);
                      toast.success("Attachment deleted");
                      void queryClient.invalidateQueries({
                        queryKey: [
                          "service-record-attachments",
                          serviceRecordId,
                        ],
                      });
                    } catch (error) {
                      toast.error(
                        getApiErrorMessage(
                          error,
                          "Unable to delete attachment",
                        ),
                      );
                    } finally {
                      setDeletingAttachmentId(null);
                    }
                  }}
                  aria-label={`Delete ${attachment.fileName}`}
                >
                  {deletingAttachmentId === attachment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
