import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  UpdateGroupInput,
  deleteGroup,
  getGroup,
  updateGroup,
} from "@/server/domain/serviceGroups";

const ClientUpdateGroup = UpdateGroupInput.omit({
  groupId: true,
  actorId: true,
});

export const GET = withUser<unknown, { id: string }>(
  "api/service-groups/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const group = await getGroup(session.ctx, id);
    return { group };
  },
);

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/service-groups/[id]",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateGroup.parse(await parseJsonBody(req));
    const group = await updateGroup(session.ctx, {
      ...body,
      groupId: id,
      actorId: user.id,
    });
    return { group };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/service-groups/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteGroup(session.ctx, id);
    return { ok: true };
  },
);
