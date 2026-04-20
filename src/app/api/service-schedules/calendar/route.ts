import { z } from "zod";

import { withUser } from "@/server/auth/route";
import { listCalendarMonth } from "@/server/domain/serviceSchedules";

const Query = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

export const GET = withUser("api/service-schedules/calendar", async (req, session) => {
  const url = new URL(req.url);
  const { year, month } = Query.parse({
    year: url.searchParams.get("year"),
    month: url.searchParams.get("month"),
  });
  const schedules = await listCalendarMonth(session.ctx, { year, month });
  return { schedules };
});
