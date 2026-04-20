import { NextResponse } from "next/server";

import { parseJsonBody, withUser } from "@/server/auth/route";
import {
  CompleteScheduledServiceInput,
  completeScheduledService,
} from "@/server/domain/serviceRecords";

const ClientComplete = CompleteScheduledServiceInput.omit({ actorId: true });

export const POST = withUser(
  "api/service-records/complete-scheduled",
  async (req, session, user) => {
    const body = ClientComplete.parse(await parseJsonBody(req));
    const result = await completeScheduledService(session.ctx, {
      ...body,
      actorId: user.id,
    });
    return NextResponse.json(result, { status: 201 });
  },
);
