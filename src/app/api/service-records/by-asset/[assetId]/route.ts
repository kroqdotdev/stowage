import { withUser } from "@/server/auth/route";
import { listAssetRecords } from "@/server/domain/serviceRecords";

export const GET = withUser<unknown, { assetId: string }>(
  "api/service-records/by-asset/[assetId]",
  async (_req, session, _user, { params }) => {
    const { assetId } = await params;
    const records = await listAssetRecords(session.ctx, assetId);
    return { records };
  },
);
