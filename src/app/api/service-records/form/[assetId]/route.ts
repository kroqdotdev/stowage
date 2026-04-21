import { withUser } from "@/server/auth/route";
import { getRecordFormDefinition } from "@/server/domain/serviceRecords";

export const GET = withUser<unknown, { assetId: string }>(
  "api/service-records/form/[assetId]",
  async (req, session, _user, { params }) => {
    const { assetId } = await params;
    const url = new URL(req.url);
    const recordId = url.searchParams.get("recordId") ?? undefined;
    const form = await getRecordFormDefinition(session.ctx, {
      assetId,
      recordId,
    });
    return { form };
  },
);
