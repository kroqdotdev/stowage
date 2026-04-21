import { parseJsonBody, withAdmin } from "@/server/auth/route";
import {
  UpdateFieldInput,
  deleteField,
  updateField,
} from "@/server/domain/serviceGroupFields";

const ClientUpdateField = UpdateFieldInput.omit({
  fieldId: true,
  actorId: true,
});

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/service-group-fields/[id]",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateField.parse(await parseJsonBody(req));
    const field = await updateField(session.ctx, {
      ...body,
      fieldId: id,
      actorId: user.id,
    });
    return { field };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/service-group-fields/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteField(session.ctx, id);
    return { ok: true };
  },
);
