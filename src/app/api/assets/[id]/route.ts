import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  UpdateAssetInput,
  deleteAsset,
  getAsset,
  updateAsset,
} from "@/server/domain/assets";

const ClientUpdateAsset = UpdateAssetInput.omit({
  assetId: true,
  actorId: true,
});

export const GET = withUser<unknown, { id: string }>(
  "api/assets/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const asset = await getAsset(session.ctx, id);
    return { asset };
  },
);

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/assets/[id]",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateAsset.parse(await parseJsonBody(req));
    await updateAsset(session.ctx, {
      ...body,
      assetId: id,
      actorId: user.id,
    });
    return { ok: true };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/assets/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteAsset(session.ctx, id);
    return { ok: true };
  },
);
