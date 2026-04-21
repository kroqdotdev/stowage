import { withAdmin, withUser } from "@/server/auth/route";
import {
  deleteSchedule,
  getScheduleByAssetId,
} from "@/server/domain/serviceSchedules";

export const GET = withUser<unknown, { assetId: string }>(
  "api/service-schedules/by-asset/[assetId]",
  async (_req, session, _user, { params }) => {
    const { assetId } = await params;
    const schedule = await getScheduleByAssetId(session.ctx, assetId);
    return { schedule };
  },
);

export const DELETE = withAdmin<unknown, { assetId: string }>(
  "api/service-schedules/by-asset/[assetId]",
  async (_req, session, _user, { params }) => {
    const { assetId } = await params;
    await deleteSchedule(session.ctx, assetId);
    return { ok: true };
  },
);
