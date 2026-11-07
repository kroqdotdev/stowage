"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { getAttachmentUiErrorMessage } from "@/components/attachments/error-messages";
import { listAttachments, uploadAttachment } from "@/lib/api/attachments";
import { cn } from "@/lib/utils";

/*
  The hero photo: the asset's first ready image attachment. Without one, a
  long-dash slot says "Add photo…"; phones offer the camera or the library.
*/
export function AssetPhotoSlot({
  assetId,
  assetName,
  className,
}: {
  assetId: string;
  assetName: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const attachmentsQuery = useQuery({
    queryKey: ["attachments", assetId],
    queryFn: () => listAttachments(assetId),
  });

  const photo = (attachmentsQuery.data ?? []).find(
    (item) => item.fileKind === "image" && item.status === "ready" && item.url,
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadAttachment(assetId, file);
      toast.success("Photo added");
      void queryClient.invalidateQueries({ queryKey: ["attachments", assetId] });
      void queryClient.invalidateQueries({ queryKey: ["storage-usage"] });
    } catch (error) {
      toast.error(getAttachmentUiErrorMessage(error, "Couldn't add the photo. Try again."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (photo?.url) {
    return (
      <a
        href={photo.url}
        target="_blank"
        rel="noreferrer"
        className={cn("block overflow-hidden rounded-md border border-border bg-card", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served by PocketBase */}
        <img src={photo.url} alt={assetName} className="size-full object-cover" />
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || attachmentsQuery.isPending}
        aria-label="Add photo…"
        className={cn(
          "dash-slot flex cursor-pointer flex-col items-center justify-center gap-1.5 px-2 text-ink-2 hover:bg-card/60 disabled:cursor-default",
          className,
        )}
      >
        <Camera className="size-[22px] text-muted-foreground md:size-7" aria-hidden="true" />
        <span className="text-xs font-medium md:text-[13px]">
          {uploading ? "Adding…" : "Add photo…"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </>
  );
}
