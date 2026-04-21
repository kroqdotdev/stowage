import type { Ctx } from "./context";
import { DomainError } from "./errors";

export class StorageQuotaError extends DomainError {
  constructor(message: string) {
    super(message, 413);
    this.name = "StorageQuotaError";
  }
}

export function getStorageLimitBytes(): number | null {
  const raw = process.env.STORAGE_LIMIT_GB;
  if (!raw || raw.trim() === "") return null;
  const gb = Number(raw);
  if (Number.isNaN(gb) || gb <= 0) return null;
  return Math.round(gb * 1024 * 1024 * 1024);
}

type AttachmentRow = {
  status: "pending" | "processing" | "ready" | "failed";
  fileSizeOriginal: number;
  fileSizeOptimized?: number | null;
};

type ServiceAttachmentRow = { fileSize: number };

export async function getTotalStorageUsedBytes(ctx: Ctx): Promise<number> {
  let total = 0;

  const attachments = await ctx.pb
    .collection("attachments")
    .getFullList<AttachmentRow>();
  for (const att of attachments) {
    if (att.status === "failed") continue;
    total += att.fileSizeOptimized ?? att.fileSizeOriginal;
  }

  const serviceAttachments = await ctx.pb
    .collection("serviceRecordAttachments")
    .getFullList<ServiceAttachmentRow>();
  for (const att of serviceAttachments) {
    total += att.fileSize;
  }

  return total;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export async function enforceStorageQuota(
  ctx: Ctx,
  incomingBytes: number,
): Promise<void> {
  const limitBytes = getStorageLimitBytes();
  if (limitBytes === null) return;

  const usedBytes = await getTotalStorageUsedBytes(ctx);
  if (usedBytes + incomingBytes > limitBytes) {
    throw new StorageQuotaError(
      `Storage limit reached. You are using ${formatBytes(usedBytes)} of ${formatBytes(limitBytes)}.`,
    );
  }
}

export async function getStorageUsage(
  ctx: Ctx,
): Promise<{ usedBytes: number; limitBytes: number | null }> {
  const [usedBytes, limitBytes] = [
    await getTotalStorageUsedBytes(ctx),
    getStorageLimitBytes(),
  ];
  return { usedBytes, limitBytes };
}
