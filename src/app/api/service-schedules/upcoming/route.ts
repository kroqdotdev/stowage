import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { listUpcomingServiceDueInDays } from "@/server/domain/serviceSchedules";

const Query = z.object({ days: z.coerce.number().int().positive() });

export const GET = withUser(
  "api/service-schedules/upcoming",
  async (req, session) => {
    const url = new URL(req.url);
    const { days } = Query.parse({
      days: url.searchParams.get("days") ?? "30",
    });
    const schedules = await listUpcomingServiceDueInDays(session.ctx, days);
    return { schedules };
  },
);
