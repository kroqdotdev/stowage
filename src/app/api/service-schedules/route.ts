import { parseJsonBody, withAdmin, withUser } from "@/server/auth/route";
import {
  UpsertScheduleInput,
  listScheduledAssets,
  upsertSchedule,
} from "@/server/domain/serviceSchedules";

const ClientUpsert = UpsertScheduleInput.omit({ actorId: true });

export const GET = withUser("api/service-schedules", async (_req, session) => ({
  schedules: await listScheduledAssets(session.ctx),
}));

export const PUT = withAdmin(
  "api/service-schedules",
  async (req, session, user) => {
    const body = ClientUpsert.parse(await parseJsonBody(req));
    const schedule = await upsertSchedule(session.ctx, {
      ...body,
      actorId: user.id,
    });
    return { schedule };
  },
);
