import { parseJsonBody, withAdmin } from "@/server/auth/route";
import {
  UpdateAssetStatusInput,
  updateAssetStatus,
} from "@/server/domain/assets";

const ClientUpdateStatus = UpdateAssetStatusInput.omit({
  assetId: true,
  actorId: true,
});

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/assets/[id]/status",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateStatus.parse(await parseJsonBody(req));
    await updateAssetStatus(session.ctx, {
      ...body,
      assetId: id,
      actorId: user.id,
    });
    return { ok: true };
  },
);
