import { NextResponse } from "next/server";

import { parseJsonBody, withUser } from "@/server/auth/route";
import {
  CreateRecordInput,
  createRecord,
} from "@/server/domain/serviceRecords";

const ClientCreate = CreateRecordInput.omit({ actorId: true });

export const POST = withUser(
  "api/service-records",
  async (req, session, user) => {
    const body = ClientCreate.parse(await parseJsonBody(req));
    const result = await createRecord(session.ctx, {
      ...body,
      actorId: user.id,
    });
    return NextResponse.json(result, { status: 201 });
  },
);
