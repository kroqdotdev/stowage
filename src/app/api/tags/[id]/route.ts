import { withAdmin, parseJsonBody } from "@/server/auth/route";
import { UpdateTagInput, deleteTag, updateTag } from "@/server/domain/tags";

const ClientUpdateTag = UpdateTagInput.omit({ tagId: true });

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/tags/[id]",
  async (req, session, _user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateTag.parse(await parseJsonBody(req));
    const tag = await updateTag(session.ctx, { ...body, tagId: id });
    return { tag };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/tags/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteTag(session.ctx, id);
    return { ok: true };
  },
);
