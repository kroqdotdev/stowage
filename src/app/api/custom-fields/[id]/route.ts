import { parseJsonBody, withAdmin } from "@/server/auth/route";
import {
  UpdateFieldDefinitionInput,
  deleteFieldDefinition,
  updateFieldDefinition,
} from "@/server/domain/customFields";

const ClientUpdateFieldDef = UpdateFieldDefinitionInput.omit({
  fieldDefinitionId: true,
});

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/custom-fields/[id]",
  async (req, session, _user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateFieldDef.parse(await parseJsonBody(req));
    const field = await updateFieldDefinition(session.ctx, {
      ...body,
      fieldDefinitionId: id,
    });
    return { field };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/custom-fields/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteFieldDefinition(session.ctx, id);
    return { ok: true };
  },
);
