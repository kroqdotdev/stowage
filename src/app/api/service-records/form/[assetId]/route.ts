import { withUser } from "@/server/auth/route";
import { getRecordFormDefinition } from "@/server/domain/serviceRecords";

export const GET = withUser<unknown, { assetId: string }>(
  "api/service-records/form/[assetId]",
  async (_req, session, _user, { params }) => {
    const { assetId } = await params;
    const form = await getRecordFormDefinition(session.ctx, { assetId });
    return { form };
  },
);
