import { withAdmin } from "@/server/auth/route";
import { setDefaultTemplate } from "@/server/domain/labelTemplates";

export const POST = withAdmin<unknown, { id: string }>(
  "api/label-templates/[id]/default",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    await setDefaultTemplate(session.ctx, id);
    return { ok: true };
  },
);
