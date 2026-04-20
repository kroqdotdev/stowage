import { z } from "zod";

import { parseJsonBody, withAdmin } from "@/server/auth/route";
import { reorderFields } from "@/server/domain/serviceGroupFields";

const Body = z.object({ fieldIds: z.array(z.string()) });

export const POST = withAdmin<unknown, { id: string }>(
  "api/service-groups/[id]/fields/reorder",
  async (req, session, _user, { params }) => {
    const { id } = await params;
    const body = Body.parse(await parseJsonBody(req));
    await reorderFields(session.ctx, {
      groupId: id,
      fieldIds: body.fieldIds,
    });
    return { ok: true };
  },
);
