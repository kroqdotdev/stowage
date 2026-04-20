import { z } from "zod";

import { parseJsonBody, withAdmin } from "@/server/auth/route";
import { reorderFieldDefinitions } from "@/server/domain/customFields";

const ReorderInput = z.object({
  fieldDefinitionIds: z.array(z.string()),
});

export const POST = withAdmin("api/custom-fields/reorder", async (req, session) => {
  const body = ReorderInput.parse(await parseJsonBody(req));
  await reorderFieldDefinitions(session.ctx, body.fieldDefinitionIds);
  return { ok: true };
});
