import { withAdmin } from "@/server/auth/route";
import { ensureDefaultTemplates } from "@/server/domain/labelTemplates";

export const POST = withAdmin(
  "api/label-templates/ensure-defaults",
  async (_req, session, user) => {
    const result = await ensureDefaultTemplates(session.ctx, user.id);
    return result;
  },
);
