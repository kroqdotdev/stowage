import { NextResponse } from "next/server";

import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  CreateFieldInput,
  createField,
  listFields,
} from "@/server/domain/serviceGroupFields";

const ClientCreateField = CreateFieldInput.omit({
  groupId: true,
  actorId: true,
});

export const GET = withUser<unknown, { id: string }>(
  "api/service-groups/[id]/fields",
  async (_req, session, _user, { params }) => {
    const { id } = await params;
    const fields = await listFields(session.ctx, id);
    return { fields };
  },
);

export const POST = withAdmin<unknown, { id: string }>(
  "api/service-groups/[id]/fields",
  async (req, session, user, { params }) => {
    const { id } = await params;
    const body = ClientCreateField.parse(await parseJsonBody(req));
    const field = await createField(session.ctx, {
      ...body,
      groupId: id,
      actorId: user.id,
    });
    return NextResponse.json({ field }, { status: 201 });
  },
);
