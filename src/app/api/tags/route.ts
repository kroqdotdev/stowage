import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateTagInput,
  createTag,
  listTags,
} from "@/server/domain/tags";

export const GET = withUser("api/tags", async (_req, session) => ({
  tags: await listTags(session.ctx),
}));

export const POST = withAdmin("api/tags", async (req, session) => {
  const body = CreateTagInput.parse(await parseJsonBody(req));
  const tag = await createTag(session.ctx, body);
  return NextResponse.json({ tag }, { status: 201 });
});
