import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateFieldDefinitionInput,
  createFieldDefinition,
  listFieldDefinitions,
} from "@/server/domain/customFields";

export const GET = withUser("api/custom-fields", async (_req, session) => ({
  fields: await listFieldDefinitions(session.ctx),
}));

export const POST = withAdmin("api/custom-fields", async (req, session) => {
  const body = CreateFieldDefinitionInput.parse(await parseJsonBody(req));
  const field = await createFieldDefinition(session.ctx, body);
  return NextResponse.json({ field }, { status: 201 });
});
