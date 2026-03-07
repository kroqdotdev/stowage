"use client";

import type { Id } from "@/lib/convex-api";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { FileUploadZone } from "@/components/attachments/file-upload-zone";

export function AttachmentsPanel({ assetId }: { assetId: Id<"assets"> }) {
  return (
    <div className="space-y-4">
      <FileUploadZone assetId={assetId} />
      <AttachmentList assetId={assetId} />
    </div>
  );
}
