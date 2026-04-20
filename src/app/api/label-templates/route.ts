import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateTemplateInput,
  createTemplate,
  getDefaultTemplate,
  listTemplates,
} from "@/server/domain/labelTemplates";

const ClientCreateTemplate = CreateTemplateInput.omit({ actorId: true });

export const GET = withUser("api/label-templates", async (req, session) => {
  const variant = new URL(req.url).searchParams.get("variant");
  if (variant === "default") {
    return { template: await getDefaultTemplate(session.ctx) };
  }
  return { templates: await listTemplates(session.ctx) };
});

export const POST = withAdmin(
  "api/label-templates",
  async (req, session, user) => {
    const body = ClientCreateTemplate.parse(await parseJsonBody(req));
    const template = await createTemplate(session.ctx, {
      ...body,
      actorId: user.id,
    });
    return NextResponse.json({ template }, { status: 201 });
  },
);
