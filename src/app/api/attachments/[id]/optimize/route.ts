import { withUser } from "@/server/auth/route";
import { retryAttachmentOptimization } from "@/server/domain/attachments";
import { processAttachmentOptimization } from "@/server/domain/attachmentsProcessing";

export const POST = withUser<unknown, { id: string }>(
  "api/attachments/[id]/optimize",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    // Flip status back to pending; this throws if the record is already ready
    // or in-flight, matching the Convex retry semantics.
    await retryAttachmentOptimization(session.ctx, id);
    await processAttachmentOptimization(session.ctx, id);
    return { ok: true };
  },
);
