import { withUser } from "@/server/auth/route";
import { getAttachmentDownloadSource } from "@/server/domain/attachments";
import { NotFoundError } from "@/server/pb/errors";
import { proxyPbFile } from "@/server/pb/files";

export const GET = withUser<unknown, { id: string }>(
  "api/attachments/[id]/download",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const source = await getAttachmentDownloadSource(session.ctx, id);
    if (!source) {
      throw new NotFoundError("Attachment file not found");
    }
    return proxyPbFile(session.ctx, source);
  },
);
