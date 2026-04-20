import { withUser } from "@/server/auth/route";
import { listAttachmentQueueStatuses } from "@/server/domain/attachments";
import { ValidationError } from "@/server/pb/errors";

export const GET = withUser("api/attachments/queue-status", async (req, session) => {
  const url = new URL(req.url);
  const assetId = url.searchParams.get("assetId");
  if (!assetId) {
    throw new ValidationError("assetId is required");
  }
  const statuses = await listAttachmentQueueStatuses(session.ctx, assetId);
  return { statuses };
});
