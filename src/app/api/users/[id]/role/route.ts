import { parseJsonBody, withAdmin } from "@/server/auth/route";
import {
  UpdateUserRoleInput,
  updateUserRole,
} from "@/server/domain/users";

const ClientUpdateRole = UpdateUserRoleInput.omit({
  userId: true,
  actorId: true,
});

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/users/[id]/role",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateRole.parse(await parseJsonBody(req));
    const updated = await updateUserRole(session.ctx, {
      ...body,
      userId: id,
      actorId: user.id,
    });
    return { user: updated };
  },
);
