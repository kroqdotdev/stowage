import { withUser } from "@/server/auth/route";
import { listGroupAssets } from "@/server/domain/serviceGroups";

export const GET = withUser<unknown, { id: string }>(
  "api/service-groups/[id]/assets",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const assets = await listGroupAssets(session.ctx, id);
    return { assets };
  },
);
