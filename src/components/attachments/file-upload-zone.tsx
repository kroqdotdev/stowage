"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Loader2, XCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { getAttachmentUiErrorMessage } from "@/components/attachments/error-messages";
import { cn } from "@/lib/utils";
import type { Id } from "@/lib/convex-api";
import { api } from "@/lib/convex-api";

function formatStorageSize(bytes: number) {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 20;
const UPLOAD_CONCURRENCY = 3;
const READY_REMOVE_DELAY_MS = 5_000;
const QUEUED_OR_FAILED_REMOVE_DELAY_MS = 30_000;

const ALLOWED_EXTENSIONS = new Set([
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

type UploadStatus = "uploading" | "registering" | "queued" | "ready" | "error";

type UploadJob = {
  id: string;
  fileName: string;
  status: UploadStatus;
  progress: number;
  attachmentId: Id<"attachments"> | null;
  error: string | null;
};

type QueueTrackingItem = {
  _id: Id<"attachments">;
  status: "pending" | "processing" | "ready" | "failed";
  optimizationError: string | null;
};

function getExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot < 0 || lastDot === fileName.length - 1) {
    return "";
  }
  return fileName.slice(lastDot + 1).toLocaleLowerCase();
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function uploadWithProgress(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  return new Promise<Id<"_storage">>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", uploadUrl, true);
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("Upload failed"));
        return;
      }

      const response = request.response as { storageId?: string } | null;
      const storageId = response?.storageId;
      if (!storageId) {
        reject(new Error("Upload did not return a storage id"));
        return;
      }

      resolve(storageId as Id<"_storage">);
    };

    request.onerror = () => {
      reject(new Error("Upload failed"));
    };

    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    request.send(file);
  });
}

export function FileUploadZone({ assetId }: { assetId: Id<"assets"> }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const createAttachment = useMutation(api.attachments.createAttachment);
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const attachmentQueueStatuses = useQuery(
    api.attachments.listAttachmentQueueStatuses,
    { assetId },
  );
  const storageUsage = useQuery(api.storage_quota.getStorageUsage);
  const quotaExceeded =
    storageUsage?.limitBytes != null &&
    storageUsage.usedBytes >= storageUsage.limitBytes;

  const [dragActive, setDragActive] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const removalTimersRef = useRef<
    Map<string, { status: UploadStatus; timeoutId: number }>
  >(new Map());

  const attachmentStatusById = useMemo(() => {
    const map = new Map<Id<"attachments">, QueueTrackingItem>();
    for (const row of (attachmentQueueStatuses ?? []) as QueueTrackingItem[]) {
      map.set(row._id, row);
    }
    return map;
  }, [attachmentQueueStatuses]);

  const queueJobs = useMemo(
    () =>
      jobs.map((job) => {
        if (!job.attachmentId) {
          return job;
        }

        const trackedAttachment = attachmentStatusById.get(job.attachmentId);
        if (!trackedAttachment) {
          return job;
        }

        if (trackedAttachment.status === "ready") {
          return {
            ...job,
            status: "ready" as const,
            error: null,
          };
        }

        if (trackedAttachment.status === "failed") {
          return {
            ...job,
            status: "error" as const,
            error: trackedAttachment.optimizationError ?? "Optimization failed",
          };
        }

        if (
          trackedAttachment.status === "pending" ||
          trackedAttachment.status === "processing"
        ) {
          if (job.status === "uploading" || job.status === "registering") {
            return job;
          }
          return {
            ...job,
            status: "queued" as const,
          };
        }

        return job;
      }),
    [jobs, attachmentStatusById],
  );

  const activeJobs = useMemo(
    () =>
      queueJobs.filter(
        (job) => job.status === "uploading" || job.status === "registering",
      ),
    [queueJobs],
  );

  useEffect(() => {
    const timers = removalTimersRef.current;
    const visibleJobIds = new Set(queueJobs.map((job) => job.id));

    for (const [jobId, timer] of timers) {
      if (!visibleJobIds.has(jobId)) {
        window.clearTimeout(timer.timeoutId);
        timers.delete(jobId);
      }
    }

    for (const job of queueJobs) {
      const shouldAutoRemove =
        job.status === "ready" ||
        job.status === "queued" ||
        job.status === "error";

      const existingTimer = timers.get(job.id);
      if (!shouldAutoRemove) {
        if (existingTimer) {
          window.clearTimeout(existingTimer.timeoutId);
          timers.delete(job.id);
        }
        continue;
      }

      if (existingTimer && existingTimer.status === job.status) {
        continue;
      }

      if (existingTimer) {
        window.clearTimeout(existingTimer.timeoutId);
      }

      const removeDelay =
        job.status === "ready"
          ? READY_REMOVE_DELAY_MS
          : QUEUED_OR_FAILED_REMOVE_DELAY_MS;

      const timeoutId = window.setTimeout(() => {
        setJobs((previousJobs) =>
          previousJobs.filter((previousJob) => previousJob.id !== job.id),
        );
        removalTimersRef.current.delete(job.id);
      }, removeDelay);

      timers.set(job.id, { status: job.status, timeoutId });
    }
  }, [queueJobs]);

  useEffect(
    () => () => {
      for (const timer of removalTimersRef.current.values()) {
        window.clearTimeout(timer.timeoutId);
      }
      removalTimersRef.current.clear();
    },
    [],
  );

  function upsertJob(id: string, patch: Partial<UploadJob>) {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? {
              ...job,
              ...patch,
            }
          : job,
      ),
    );
  }

  function appendJob(fileName: string) {
    const id = crypto.randomUUID();
    const next: UploadJob = {
      id,
      fileName,
      status: "uploading",
      progress: 0,
      attachmentId: null,
      error: null,
    };

    setJobs((prev) => [next, ...prev].slice(0, 50));
    return id;
  }

  function validateFiles(inputFiles: File[]) {
    const accepted: File[] = [];

    if (inputFiles.length > MAX_FILES_PER_BATCH) {
      toast.error(`You can upload up to ${MAX_FILES_PER_BATCH} files at once.`);
    }

    for (const file of inputFiles.slice(0, MAX_FILES_PER_BATCH)) {
      const extension = getExtension(file.name);
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(
          `File too large: ${file.name} (${formatFileSize(file.size)})`,
        );
        continue;
      }

      accepted.push(file);
    }

    return accepted;
  }

  async function uploadSingle(file: File) {
    const jobId = appendJob(file.name);

    try {
      const { uploadUrl } = await generateUploadUrl({});
      const storageId = await uploadWithProgress(uploadUrl, file, (progress) =>
        upsertJob(jobId, { progress, status: "uploading" }),
      );

      upsertJob(jobId, {
        status: "registering",
        progress: 100,
      });

      const created = await createAttachment({
        assetId,
        storageId,
        fileName: file.name,
        fileType: file.type || null,
        fileSize: file.size,
      });

      upsertJob(jobId, {
        status: "queued",
        attachmentId: created.attachmentId,
        error: null,
      });
    } catch (error) {
      upsertJob(jobId, {
        status: "error",
        error: getAttachmentUiErrorMessage(error, "Upload failed"),
      });
    }
  }

  async function uploadBatch(inputFiles: File[]) {
    const files = validateFiles(inputFiles);
    if (files.length === 0) {
      return;
    }

    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }).map(
        async () => {
          while (cursor < files.length) {
            const file = files[cursor];
            cursor += 1;
            if (file) {
              await uploadSingle(file);
            }
          }
        },
      ),
    );

    toast.success(
      files.length === 1
        ? "Attachment uploaded"
        : `${files.length} attachments uploaded`,
    );
  }

  function handleDrop(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (quotaExceeded) {
      toast.error("Storage limit reached. Delete files to free up space.");
      return;
    }

    void uploadBatch(Array.from(files));
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-xl border-2 border-dashed p-4 transition-colors",
          dragActive
            ? "border-primary/70 bg-primary/5"
            : "border-border/60 bg-muted/10 hover:bg-muted/15",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleDrop(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.avif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          data-testid="attachment-file-input"
          onChange={(event) => {
            handleDrop(event.target.files);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg px-3 py-4 text-center"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Images, PDFs, and Office files. Max 25 MB per file.
          </p>
        </button>
      </div>

      {storageUsage?.limitBytes != null ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Storage</span>
            <span>
              {formatStorageSize(storageUsage.usedBytes)} /{" "}
              {formatStorageSize(storageUsage.limitBytes)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-[width] duration-200",
                quotaExceeded ? "bg-destructive" : "bg-primary",
              )}
              style={{
                width: `${Math.min(100, (storageUsage.usedBytes / storageUsage.limitBytes) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {queueJobs.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border/60 bg-background p-3">
          {queueJobs.map((job) => (
            <div key={job.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium">{job.fileName}</p>
                <span className="text-[11px] text-muted-foreground">
                  {job.status === "uploading" && `${job.progress}%`}
                  {job.status === "registering" && "Registering"}
                  {job.status === "queued" && "Queued for optimization"}
                  {job.status === "ready" && "Ready"}
                  {job.status === "error" && "Failed"}
                </span>
              </div>
              {job.status === "uploading" || job.status === "registering" ? (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-200"
                    style={{
                      width: `${Math.min(100, Math.max(0, job.progress))}%`,
                    }}
                  />
                </div>
              ) : null}
              {job.status === "error" && job.error ? (
                <p className="inline-flex items-center gap-1 text-[11px] text-destructive">
                  <XCircle className="size-3.5" />
                  {job.error}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {activeJobs.length > 0 ? (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Uploading {activeJobs.length} file{activeJobs.length === 1 ? "" : "s"}
          ...
        </p>
      ) : null}
    </div>
  );
}
