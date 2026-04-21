import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin } from "@/server/auth/route";
import { CreateUserInput, createUser, listUsers } from "@/server/domain/users";

const ClientCreateUser = CreateUserInput.omit({ actorId: true });

export const GET = withAdmin("api/users", async (_req, session) => ({
  users: await listUsers(session.ctx),
}));

export const POST = withAdmin("api/users", async (req, session, user) => {
  const body = ClientCreateUser.parse(await parseJsonBody(req));
  const created = await createUser(session.ctx, { ...body, actorId: user.id });
  return NextResponse.json({ user: created }, { status: 201 });
});
