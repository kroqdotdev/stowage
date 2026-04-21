import { withUser } from "@/server/auth/route";
import {
  deleteAttachment,
  getAttachmentUrl,
} from "@/server/domain/attachments";

export const GET = withUser<unknown, { id: string }>(
  "api/attachments/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const url = await getAttachmentUrl(session.ctx, id);
    return { url };
  },
);

export const DELETE = withUser<unknown, { id: string }>(
  "api/attachments/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteAttachment(session.ctx, id);
    return { ok: true };
  },
);
