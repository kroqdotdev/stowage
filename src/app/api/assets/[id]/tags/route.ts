import { z } from "zod";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import { getAssetTags, setAssetTags } from "@/server/domain/assetTags";

const Body = z.object({ tagIds: z.array(z.string()) });

export const GET = withUser<unknown, { id: string }>(
  "api/assets/[id]/tags",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const tags = await getAssetTags(session.ctx, id);
    return { tags };
  },
);

export const PUT = withAdmin<unknown, { id: string }>(
  "api/assets/[id]/tags",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = Body.parse(await parseJsonBody(req));
    await setAssetTags(session.ctx, {
      assetId: id,
      tagIds: body.tagIds,
      actorId: user.id,
    });
    return { ok: true };
  },
);
