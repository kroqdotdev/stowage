import { withUser } from "@/server/auth/route";
import { deleteServiceRecordAttachment } from "@/server/domain/serviceRecordAttachments";

export const DELETE = withUser<unknown, { id: string }>(
  "api/service-record-attachments/[id]",
  async (_req, session, user, { params }) => {
    const { id } = await params;
    await deleteServiceRecordAttachment(session.ctx, id, {
      id: user.id,
      role: user.role,
    });
    return { ok: true };
  },
);
