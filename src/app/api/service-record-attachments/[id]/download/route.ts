import { withUser } from "@/server/auth/route";
import { getServiceRecordAttachmentDownloadSource } from "@/server/domain/serviceRecordAttachments";
import { NotFoundError } from "@/server/pb/errors";
import { proxyPbFile } from "@/server/pb/files";

export const GET = withUser<unknown, { id: string }>(
  "api/service-record-attachments/[id]/download",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const source = await getServiceRecordAttachmentDownloadSource(
      session.ctx,
      id,
    );
    if (!source) {
      throw new NotFoundError("Service record attachment file not found");
    }
    return proxyPbFile(session.ctx, source);
  },
);
