import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  UpdateTemplateInput,
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "@/server/domain/labelTemplates";

const ClientUpdateTemplate = UpdateTemplateInput.omit({
  templateId: true,
  actorId: true,
});

export const GET = withUser<unknown, { id: string }>(
  "api/label-templates/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const template = await getTemplate(session.ctx, id);
    return { template };
  },
);

export const PATCH = withAdmin<unknown, { id: string }>(
  "api/label-templates/[id]",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientUpdateTemplate.parse(await parseJsonBody(req));
    const template = await updateTemplate(session.ctx, {
      ...body,
      templateId: id,
      actorId: user.id,
    });
    return { template };
  },
);

export const DELETE = withAdmin<unknown, { id: string }>(
  "api/label-templates/[id]",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await deleteTemplate(session.ctx, id);
    return { ok: true };
  },
);
