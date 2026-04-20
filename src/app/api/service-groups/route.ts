import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateGroupInput,
  createGroup,
  listAssignableGroups,
  listGroups,
} from "@/server/domain/serviceGroups";

const ClientCreateGroup = CreateGroupInput.omit({ actorId: true });

export const GET = withUser("api/service-groups", async (req, session) => {
  const variant = new URL(req.url).searchParams.get("variant");
  if (variant === "assignable") {
    return { groups: await listAssignableGroups(session.ctx) };
  }
  return { groups: await listGroups(session.ctx) };
});

export const POST = withAdmin(
  "api/service-groups",
  async (req, session, user) => {
    const body = ClientCreateGroup.parse(await parseJsonBody(req));
    const group = await createGroup(session.ctx, {
      ...body,
      actorId: user.id,
    });
    return NextResponse.json({ group }, { status: 201 });
  },
);
